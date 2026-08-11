import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import type { BlockData } from "./block.types";
import { POSITION_X, POSITION_Y, ROTATION, SIZE_HEIGHT, SIZE_WIDTH } from "./property-keys";

describe("BlockGroupAPI (group / ungroup / add / remove)", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  const store = () => engine._getBlockStore();
  const snap = (id: number) => store().snapshot(id) as BlockData;

  /** Create a positioned graphic block parented to `page`. */
  function addChild(page: number, x: number, y: number, w = 20, h = 20): number {
    const id = engine.block.create("graphic");
    engine.block.appendChild(page, id);
    engine.block.setPosition(id, x, y);
    engine.block.setSize(id, w, h);
    return id;
  }

  function setup() {
    const page = engine.block.create("page");
    const a = addChild(page, 10, 20, 30, 40);
    const b = addChild(page, 100, 5, 20, 20);
    return { page, a, b };
  }

  it("groups blocks: union bbox origin, local child coords, reparent", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]);

    expect(store().getType(gid)).toBe("group");
    expect(store().getFloat(gid, POSITION_X)).toBeCloseTo(10);
    expect(store().getFloat(gid, POSITION_Y)).toBeCloseTo(5);
    expect(store().getFloat(gid, SIZE_WIDTH)).toBeCloseTo(110);
    expect(store().getFloat(gid, SIZE_HEIGHT)).toBeCloseTo(55);

    // Children reparented to the group with group-LOCAL coords.
    expect(store().getParent(a)).toBe(gid);
    expect(store().getParent(b)).toBe(gid);
    expect(store().getFloat(a, POSITION_X)).toBeCloseTo(0);
    expect(store().getFloat(a, POSITION_Y)).toBeCloseTo(15);
    expect(store().getFloat(b, POSITION_X)).toBeCloseTo(90);
    expect(store().getFloat(b, POSITION_Y)).toBeCloseTo(0);

    // Group is now the page's child; members are not.
    expect(store().getParent(gid)).toBe(page);
    expect(store().getChildren(page)).toEqual([gid]);
    expect(store().getChildren(gid)).toEqual([a, b]);
  });

  it("group + undo restores byte-identical pre-group state (snapshot equality)", () => {
    const { page, a, b } = setup();
    const before = { page: snap(page), a: snap(a), b: snap(b) };

    engine.block.group([a, b]);
    engine.undo();

    expect(snap(a)).toEqual(before.a);
    expect(snap(b)).toEqual(before.b);
    expect(snap(page)).toEqual(before.page);
  });

  it("group is a single undoable entry", () => {
    const { page, a, b } = setup();
    engine.block.group([a, b]);
    expect(engine.canUndo()).toBe(true);
    engine.undo();
    // One undo fully reverses the group: members back on the page, group gone.
    expect(store().getParent(a)).toBe(page);
    expect(store().getParent(b)).toBe(page);
    expect(store().findByType("group")).toEqual([]);
  });

  it("ungroup restores original parent, index (z-order), and absolute position", () => {
    const { page, a, b } = setup();
    // Insert a decoy so index restoration is meaningful.
    const decoy = addChild(page, 0, 0);
    // page children: [a, b, decoy]
    const gid = engine.block.group([a, b]);
    // page children now: [decoy, gid]
    expect(store().getChildren(page)).toEqual([decoy, gid]);

    const freed = engine.block.ungroup(gid);
    expect(freed).toEqual([a, b]);
    expect(store().exists(gid)).toBe(false);

    // Members restored to page at the group's slot (index 1), in order.
    expect(store().getChildren(page)).toEqual([decoy, a, b]);
    expect(store().getParent(a)).toBe(page);
    // Absolute coords restored.
    expect(store().getFloat(a, POSITION_X)).toBeCloseTo(10);
    expect(store().getFloat(a, POSITION_Y)).toBeCloseTo(20);
    expect(store().getFloat(b, POSITION_X)).toBeCloseTo(100);
    expect(store().getFloat(b, POSITION_Y)).toBeCloseTo(5);
  });

  it("ungroup restores absolute position when the group was moved", () => {
    const { a, b } = setup();
    const gid = engine.block.group([a, b]);
    // Move the whole group by (5, 7).
    engine.block.setPosition(gid, 15, 12);

    engine.block.ungroup(gid);
    // a's absolute = new group origin + local (0,15) = (15, 27)
    expect(store().getFloat(a, POSITION_X)).toBeCloseTo(15);
    expect(store().getFloat(a, POSITION_Y)).toBeCloseTo(27);
    // b's absolute = (15 + 90, 12 + 0) = (105, 12)
    expect(store().getFloat(b, POSITION_X)).toBeCloseTo(105);
    expect(store().getFloat(b, POSITION_Y)).toBeCloseTo(12);
  });

  it("ungroup + undo restores the grouped state (snapshot equality)", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]);
    const grouped = { page: snap(page), a: snap(a), b: snap(b), g: snap(gid) };

    engine.block.ungroup(gid);
    engine.undo();

    expect(snap(a)).toEqual(grouped.a);
    expect(snap(b)).toEqual(grouped.b);
    expect(snap(page)).toEqual(grouped.page);
    expect(snap(gid)).toEqual(grouped.g);
  });

  it("addToGroup converts to group-local coords and undoes cleanly", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]); // origin (10, 5)
    const c = addChild(page, 200, 205);
    const before = snap(c);

    engine.block.addToGroup(gid, c);
    expect(store().getParent(c)).toBe(gid);
    expect(store().getFloat(c, POSITION_X)).toBeCloseTo(190);
    expect(store().getFloat(c, POSITION_Y)).toBeCloseTo(200);

    engine.undo();
    expect(snap(c)).toEqual(before);
    expect(store().getParent(c)).toBe(page);
  });

  it("removeFromGroup restores absolute coords and undoes cleanly", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]); // origin (10, 5); a local (0,15)
    const grouped = snap(a);

    engine.block.removeFromGroup(gid, a);
    expect(store().getParent(a)).toBe(page);
    expect(store().getFloat(a, POSITION_X)).toBeCloseTo(10);
    expect(store().getFloat(a, POSITION_Y)).toBeCloseTo(20);

    engine.undo();
    expect(snap(a)).toEqual(grouped);
    expect(store().getParent(a)).toBe(gid);
  });

  it("group → undo → redo re-establishes the group (no lost sub-blocks)", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]);
    const grouped = { a: snap(a), b: snap(b), g: snap(gid) };

    engine.undo();
    engine.redo();

    // Members survive the undo/redo round-trip and are back inside the group.
    expect(store().exists(a)).toBe(true);
    expect(store().exists(b)).toBe(true);
    expect(store().getParent(a)).toBe(gid);
    expect(store().getParent(b)).toBe(gid);
    expect(store().getChildren(gid)).toEqual([a, b]);
    expect(snap(a)).toEqual(grouped.a);
    expect(snap(b)).toEqual(grouped.b);
    expect(snap(gid)).toEqual(grouped.g);
    expect(store().getChildren(page)).toEqual([gid]);
  });

  it("ungroup → undo → redo frees the members again (no cascade destroy)", () => {
    const { page, a, b } = setup();
    const gid = engine.block.group([a, b]);
    engine.block.ungroup(gid);

    engine.undo(); // back to grouped
    engine.redo(); // ungrouped again

    // The group's destroy on redo must NOT cascade-destroy the members.
    expect(store().exists(a)).toBe(true);
    expect(store().exists(b)).toBe(true);
    expect(store().exists(gid)).toBe(false);
    expect(store().getParent(a)).toBe(page);
    expect(store().getParent(b)).toBe(page);
    expect(store().getFloat(a, POSITION_X)).toBeCloseTo(10);
    expect(store().getFloat(a, POSITION_Y)).toBeCloseTo(20);
  });
});
