import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import type { BlockData } from "./block.types";
import { absoluteTransformOf } from "./block-group-api";
import { POSITION_X, POSITION_Y, SIZE_HEIGHT, SIZE_WIDTH } from "./property-keys";

describe("block.refitGroupBounds", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  const store = () => engine._getBlockStore();
  const snapshot = (id: number) => store().snapshot(id) as BlockData;

  function createBlock(
    type: "graphic" | "group",
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
  ): number {
    const id = engine.block.create(type);
    engine.block.setPosition(id, x, y);
    engine.block.setSize(id, width, height);
    engine.block.setRotation(id, rotation);
    return id;
  }

  it("refits rotated logical rectangles and preserves child world transforms", () => {
    const groupId = createBlock("group", 100, 200, 999, 999, 30);
    const childId = createBlock("graphic", 10, 20, 30, 10, 90);
    engine.block.appendChild(groupId, childId);
    const worldBefore = absoluteTransformOf(store(), childId);
    engine.clearHistory();

    engine.block.refitGroupBounds(groupId);

    expect(engine.block.getFloat(groupId, POSITION_X)).toBeCloseTo(90);
    expect(engine.block.getFloat(groupId, POSITION_Y)).toBeCloseTo(217.320508);
    expect(engine.block.getFloat(groupId, SIZE_WIDTH)).toBeCloseTo(10);
    expect(engine.block.getFloat(groupId, SIZE_HEIGHT)).toBeCloseTo(30);
    expect(engine.block.getFloat(childId, POSITION_X)).toBeCloseTo(10);
    expect(engine.block.getFloat(childId, POSITION_Y)).toBeCloseTo(0);
    expect(absoluteTransformOf(store(), childId)).toEqual(
      expect.objectContaining({
        x: expect.closeTo(worldBefore.x, 6),
        y: expect.closeTo(worldBefore.y, 6),
        rotation: expect.closeTo(worldBefore.rotation, 6),
      }),
    );
  });

  it("is one undo step and restores exact before snapshots", () => {
    const groupId = createBlock("group", 5, 6, 1, 2, 15);
    const childId = createBlock("graphic", -10, 20, 30, 40, -20);
    engine.block.appendChild(groupId, childId);
    const before = { group: snapshot(groupId), child: snapshot(childId) };
    engine.clearHistory();

    engine.block.refitGroupBounds(groupId);
    engine.undo();

    expect(snapshot(groupId)).toEqual(before.group);
    expect(snapshot(childId)).toEqual(before.child);
    expect(engine.canUndo()).toBe(false);
  });

  it("refits nested group ancestors bottom-up without changing hierarchy or z-order", () => {
    const outerId = createBlock("group", 40, 50, 1, 1, -10);
    const innerId = createBlock("group", 20, 30, 1, 1, 25);
    const siblingId = createBlock("graphic", 100, 0, 10, 10);
    const leafId = createBlock("graphic", -15, 8, 20, 12, 35);
    engine.block.appendChild(outerId, innerId);
    engine.block.appendChild(outerId, siblingId);
    engine.block.appendChild(innerId, leafId);
    const leafWorldBefore = absoluteTransformOf(store(), leafId);
    const outerBefore = snapshot(outerId);
    engine.clearHistory();

    engine.block.refitGroupBounds(innerId);

    expect(snapshot(outerId)).not.toEqual(outerBefore);
    expect(store().getChildren(outerId)).toEqual([innerId, siblingId]);
    expect(store().getChildren(innerId)).toEqual([leafId]);
    expect(absoluteTransformOf(store(), leafId)).toEqual(
      expect.objectContaining({
        x: expect.closeTo(leafWorldBefore.x, 6),
        y: expect.closeTo(leafWorldBefore.y, 6),
        rotation: expect.closeTo(leafWorldBefore.rotation, 6),
      }),
    );
  });

  it("does not create patches when repeated after convergence", () => {
    const groupId = createBlock("group", 0, 0, 1, 1);
    const childId = createBlock("graphic", 12, 14, 20, 30, 12);
    engine.block.appendChild(groupId, childId);
    engine.block.refitGroupBounds(groupId);
    const fitted = { group: snapshot(groupId), child: snapshot(childId) };
    engine.clearHistory();

    engine.block.refitGroupBounds(groupId);

    expect(snapshot(groupId)).toEqual(fitted.group);
    expect(snapshot(childId)).toEqual(fitted.child);
    expect(engine.canUndo()).toBe(false);
  });

  it("sets an empty group size to zero without shifting its origin", () => {
    const groupId = createBlock("group", 12, 34, 50, 60, 45);
    engine.clearHistory();

    engine.block.refitGroupBounds(groupId);

    expect(engine.block.getFloat(groupId, POSITION_X)).toBe(12);
    expect(engine.block.getFloat(groupId, POSITION_Y)).toBe(34);
    expect(engine.block.getFloat(groupId, SIZE_WIDTH)).toBe(0);
    expect(engine.block.getFloat(groupId, SIZE_HEIGHT)).toBe(0);
  });

  it("no-ops for missing and non-group ids", () => {
    const blockId = createBlock("graphic", 1, 2, 3, 4);
    const before = snapshot(blockId);
    engine.clearHistory();

    engine.block.refitGroupBounds(blockId);
    engine.block.refitGroupBounds(9999);

    expect(snapshot(blockId)).toEqual(before);
    expect(engine.canUndo()).toBe(false);
  });
});
