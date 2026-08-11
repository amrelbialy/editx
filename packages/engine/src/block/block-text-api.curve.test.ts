import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";
import { TEXT_CURVE_DIRECTION, TEXT_CURVE_RADIUS } from "./property-keys";

describe("BlockTextAPI curved text", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  it("setTextCurve / getTextCurve round-trips", () => {
    const id = block.create("text");
    block.setTextCurve(id, 120, "down");

    const curve = block.getTextCurve(id);
    expect(curve).not.toBeNull();
    expect(curve!.radius).toBe(120);
    expect(curve!.direction).toBe("down");
  });

  it("getTextCurve returns null when flat (radius 0 default)", () => {
    const id = block.create("text");
    expect(block.getTextCurve(id)).toBeNull();
  });

  it("setTextCurve with radius <= 0 stays flat (null)", () => {
    const id = block.create("text");
    block.setTextCurve(id, -50, "up");
    expect(block.getTextCurve(id)).toBeNull();
    // radius pinned to 0, not the negative input.
    expect(engine._getBlockStore().getFloat(id, TEXT_CURVE_RADIUS)).toBe(0);
  });

  it("setTextCurve(id, 0, ...) clears an existing curve", () => {
    const id = block.create("text");
    block.setTextCurve(id, 200, "up");
    expect(block.getTextCurve(id)).not.toBeNull();

    block.setTextCurve(id, 0, "up");
    expect(block.getTextCurve(id)).toBeNull();
  });

  it("setTextCurve is ONE batched undo entry (radius + direction together)", () => {
    const id = block.create("text");
    block.setTextCurve(id, 90, "down");
    expect(block.getTextCurve(id)).toEqual({ radius: 90, direction: "down" });

    engine.undo(); // single entry reverts BOTH props back to flat defaults
    expect(block.getTextCurve(id)).toBeNull();
    expect(engine._getBlockStore().getString(id, TEXT_CURVE_DIRECTION)).toBe("up");

    engine.redo();
    expect(block.getTextCurve(id)).toEqual({ radius: 90, direction: "down" });
  });

  it("snapshot/restore round-trips curve radius + direction", () => {
    const store = engine._getBlockStore();
    const id = block.create("text");
    block.setTextCurve(id, 150, "down");

    const snap = store.snapshot(id)!;
    expect(snap.properties[TEXT_CURVE_RADIUS]).toBe(150);
    expect(snap.properties[TEXT_CURVE_DIRECTION]).toBe("down");

    block.setTextCurve(id, 0, "up"); // mutate live → flat
    expect(block.getTextCurve(id)).toBeNull();

    store.restore(snap);
    expect(block.getTextCurve(id)).toEqual({ radius: 150, direction: "down" });
  });
});
