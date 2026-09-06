import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import { absoluteToLocal } from "./group-transform";
import { POSITION_X, POSITION_Y, ROTATION } from "./property-keys";

/**
 * High-risk seams for real group blocks (gate 4 hardening):
 *  - the two-patch split must survive undo→REDO without losing members or their
 *    fill/shape/text SUB-blocks (the whole reason the split exists);
 *  - grouping across DIFFERENT parents;
 *  - coordinate conversion into/out of a ROTATED group.
 * These exercise blocks that carry real sub-blocks (via addShape / addText),
 * not bare graphics, so the destroyBlock-cascade guard is genuinely tested.
 */
describe("group robustness — sub-block survival & cross-parent grouping", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  const store = () => engine._getBlockStore();
  const count = () => store().getAllBlockIds().length;

  /** A shape graphic (graphic + shape + fill sub-blocks) at (x,y). */
  function addShapeBlock(parent: number, x: number, y: number): number {
    return engine.block.addShape(parent, "rectangle", "color", x, y, 40, 30);
  }

  it("group → undo → redo preserves members AND their fill/shape sub-blocks", () => {
    const page = engine.block.create("page");
    const shape = addShapeBlock(page, 10, 20);
    const text = engine.block.addText(page, 100, 5, 50, 20, "hi");

    const shapeSub = store().getShape(shape);
    const fillSub = store().getFill(shape);
    expect(shapeSub).not.toBeNull();
    expect(fillSub).not.toBeNull();

    const total = count(); // page + graphic + shape + fill + text
    const gid = engine.block.group([shape, text]);
    const grouped = count(); // + group
    expect(grouped).toBe(total + 1);

    engine.undo();
    expect(count()).toBe(total);
    // Members and sub-blocks intact after undo.
    expect(store().exists(shape)).toBe(true);
    expect(store().exists(shapeSub as number)).toBe(true);
    expect(store().exists(fillSub as number)).toBe(true);

    engine.redo();
    // Block count returns exactly (no leaked/duplicated blocks), group re-formed.
    expect(count()).toBe(grouped);
    expect(store().getType(gid)).toBe("group");
    expect(store().getChildren(gid)).toEqual([shape, text]);
    // Sub-blocks survived the round-trip and still resolve from the graphic.
    expect(store().getShape(shape)).toBe(shapeSub);
    expect(store().getFill(shape)).toBe(fillSub);
    expect(store().exists(shapeSub as number)).toBe(true);
    expect(store().exists(fillSub as number)).toBe(true);
  });

  it("ungroup → undo → redo destroys ONLY the group, never member sub-blocks", () => {
    const page = engine.block.create("page");
    const shape = addShapeBlock(page, 10, 20);
    const text = engine.block.addText(page, 100, 5, 50, 20, "hi");
    const shapeSub = store().getShape(shape) as number;
    const fillSub = store().getFill(shape) as number;

    const gid = engine.block.group([shape, text]);
    const groupedCount = count();

    engine.block.ungroup(gid);
    const ungroupedCount = count(); // group destroyed → one fewer
    expect(ungroupedCount).toBe(groupedCount - 1);
    expect(store().exists(gid)).toBe(false);

    engine.undo(); // back to grouped
    expect(count()).toBe(groupedCount);
    expect(store().exists(gid)).toBe(true);
    expect(store().getShape(shape)).toBe(shapeSub);

    engine.redo(); // ungrouped again — destroy must NOT cascade into members
    expect(count()).toBe(ungroupedCount);
    expect(store().exists(gid)).toBe(false);
    expect(store().exists(shape)).toBe(true);
    expect(store().exists(text)).toBe(true);
    expect(store().exists(shapeSub)).toBe(true);
    expect(store().exists(fillSub)).toBe(true);
    expect(store().getShape(shape)).toBe(shapeSub);
    expect(store().getFill(shape)).toBe(fillSub);
  });

  it("groups blocks living under DIFFERENT parents; group homes on the first member's parent", () => {
    const page = engine.block.create("page");
    const containerA = engine.block.create("graphic");
    engine.block.appendChild(page, containerA);
    const containerB = engine.block.create("graphic");
    engine.block.appendChild(page, containerB);

    // a under containerA, b under containerB.
    const a = engine.block.create("graphic");
    engine.block.appendChild(containerA, a);
    engine.block.setPosition(a, 10, 20);
    engine.block.setSize(a, 30, 40);
    const b = engine.block.create("graphic");
    engine.block.appendChild(containerB, b);
    engine.block.setPosition(b, 100, 5);
    engine.block.setSize(b, 20, 20);

    const beforeA = store().snapshot(a);
    const beforeB = store().snapshot(b);
    const beforeContA = store().snapshot(containerA);
    const beforeContB = store().snapshot(containerB);

    const gid = engine.block.group([a, b]);

    // Group homed under the FIRST member's parent (containerA), both members adopted.
    expect(store().getParent(gid)).toBe(containerA);
    expect(store().getChildren(gid)).toEqual([a, b]);
    expect(store().getChildren(containerA)).toEqual([gid]);
    expect(store().getChildren(containerB)).toEqual([]);

    // Undo restores BOTH original parents byte-for-byte.
    engine.undo();
    expect(store().snapshot(a)).toEqual(beforeA);
    expect(store().snapshot(b)).toEqual(beforeB);
    expect(store().snapshot(containerA)).toEqual(beforeContA);
    expect(store().snapshot(containerB)).toEqual(beforeContB);
    expect(store().findByType("group")).toEqual([]);
  });
});

describe("group robustness — rotated group coordinate round-trip", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  const store = () => engine._getBlockStore();

  function child(page: number, x: number, y: number): number {
    const id = engine.block.create("graphic");
    engine.block.appendChild(page, id);
    engine.block.setPosition(id, x, y);
    engine.block.setSize(id, 20, 20);
    return id;
  }

  it("addToGroup into a ROTATED group writes correct local coords; removeFromGroup restores absolute", () => {
    const page = engine.block.create("page");
    const a = child(page, 10, 5);
    const b = child(page, 40, 5);
    const gid = engine.block.group([a, b]); // origin (10, 5), rotation 0
    engine.block.setRotation(gid, 90);

    // New block at absolute (110, 5), unrotated.
    const c = child(page, 110, 5);
    const absBefore = store().snapshot(c);
    engine.block.addToGroup(gid, c);

    // Expected local via the pure converter (single source of truth).
    const expected = absoluteToLocal({ x: 110, y: 5, rotation: 0 }, { x: 10, y: 5, rotation: 90 });
    expect(store().getParent(c)).toBe(gid);
    expect(store().getFloat(c, POSITION_X)).toBeCloseTo(expected.x);
    expect(store().getFloat(c, POSITION_Y)).toBeCloseTo(expected.y);
    expect(store().getFloat(c, ROTATION)).toBeCloseTo(expected.rotation);

    // Round-trip back out restores the original absolute transform exactly.
    engine.block.removeFromGroup(gid, c);
    expect(store().getParent(c)).toBe(page);
    expect(store().getFloat(c, POSITION_X)).toBeCloseTo(110);
    expect(store().getFloat(c, POSITION_Y)).toBeCloseTo(5);
    expect(store().getFloat(c, ROTATION)).toBeCloseTo(0);

    // Undo of removeFromGroup returns c to the group with its local coords.
    engine.undo();
    expect(store().getParent(c)).toBe(gid);
    expect(store().getFloat(c, POSITION_X)).toBeCloseTo(expected.x);

    // Undo of addToGroup restores the pre-add snapshot on the page.
    engine.undo();
    expect(store().getParent(c)).toBe(page);
    expect(store().snapshot(c)).toEqual(absBefore);
  });
});
