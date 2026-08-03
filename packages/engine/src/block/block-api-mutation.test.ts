import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import type { BlockData, Color } from "./block.types";
import { BlockAPI } from "./block-api";
import { FILL_COLOR, POSITION_X, POSITION_Y, VISIBLE } from "./property-keys";

/**
 * Regression coverage for the BlockStore mutation "side door" remediation:
 * - Public mutations flow through commands and are undo/redo round-trippable.
 * - `getSnapshot` returns a deep clone decoupled from live engine state, so
 *   consumers can no longer reach in and mutate the store.
 */
describe("BlockAPI — public mutations are undoable / redoable", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  it("setFloat round-trips through undo → redo", () => {
    const id = block.create("graphic");
    engine.clearHistory();

    block.setFloat(id, POSITION_X, 42);
    expect(block.getFloat(id, POSITION_X)).toBe(42);

    engine.undo();
    expect(block.getFloat(id, POSITION_X)).toBe(0);

    engine.redo();
    expect(block.getFloat(id, POSITION_X)).toBe(42);
  });

  it("setColor round-trips through undo → redo", () => {
    const id = block.create("graphic");
    engine.clearHistory();

    const red: Color = { r: 1, g: 0, b: 0, a: 1 };
    block.setColor(id, FILL_COLOR, red);
    expect(block.getColor(id, FILL_COLOR)).toEqual(red);

    engine.undo();
    expect(block.getColor(id, FILL_COLOR)).not.toEqual(red);

    engine.redo();
    expect(block.getColor(id, FILL_COLOR)).toEqual(red);
  });

  it("create → destroy round-trips through undo → redo", () => {
    const id = block.create("graphic");
    expect(block.exists(id)).toBe(true);

    engine.undo(); // undo create
    expect(block.exists(id)).toBe(false);

    engine.redo(); // redo create
    expect(block.exists(id)).toBe(true);
  });

  it("groups a rapid sequence and unwinds it step-by-step", () => {
    const id = block.create("graphic");
    engine.clearHistory();

    block.setFloat(id, POSITION_X, 10);
    block.setFloat(id, POSITION_Y, 20);
    block.setBool(id, VISIBLE, false);

    // Three discrete user commands → three undo steps.
    engine.undo();
    expect(block.getBool(id, VISIBLE)).toBe(true);
    engine.undo();
    expect(block.getFloat(id, POSITION_Y)).toBe(0);
    engine.undo();
    expect(block.getFloat(id, POSITION_X)).toBe(0);
    expect(engine.canUndo()).toBe(false);
  });
});

describe("BlockAPI.getSnapshot — decoupled read-only projection", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  it("returns null for an unknown id", () => {
    expect(block.getSnapshot(9999)).toBeNull();
  });

  it("reflects the current committed state", () => {
    const id = block.create("graphic");
    block.setFloat(id, POSITION_X, 42);

    const snap = block.getSnapshot(id);
    expect(snap).not.toBeNull();
    expect(snap?.properties[POSITION_X]).toBe(42);
  });

  it("returns a deep clone that does not leak back into engine state", () => {
    const id = block.create("graphic");
    block.setFloat(id, POSITION_X, 42);

    const snap = block.getSnapshot(id);
    expect(snap).not.toBeNull();

    // Cast away readonly to simulate a consumer trying to mutate the store
    // through the projection — this must NOT affect engine state.
    const mutable = snap as unknown as BlockData;
    mutable.properties[POSITION_X] = 999;
    mutable.name = "hacked";
    mutable.children.push(123);

    // Live reads are unaffected.
    expect(block.getFloat(id, POSITION_X)).toBe(42);
    expect(block.getName(id)).not.toBe("hacked");
    expect(block.getChildren(id)).not.toContain(123);

    // A fresh snapshot is likewise unaffected by the earlier mutation.
    const snap2 = block.getSnapshot(id);
    expect(snap2?.properties[POSITION_X]).toBe(42);
    expect(snap2?.name).not.toBe("hacked");
    expect(snap2?.children).not.toContain(123);
  });

  it("hands out independent clones on each call", () => {
    const id = block.create("graphic");
    const a = block.getSnapshot(id);
    const b = block.getSnapshot(id);
    expect(a).not.toBe(b);
    expect(a?.properties).not.toBe(b?.properties);
  });
});
