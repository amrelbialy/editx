import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import type { BlockData } from "./block.types";
import { absoluteTransformOf } from "./block-group-api";
import { POSITION_X, POSITION_Y, SIZE_HEIGHT, SIZE_WIDTH } from "./property-keys";

describe("group hierarchy invariants", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  const store = () => engine._getBlockStore();
  const snapshot = (id: number) => store().snapshot(id) as BlockData;

  it("rejects public self-parenting without adding history", () => {
    const groupId = engine.block.create("group");
    const before = snapshot(groupId);
    engine.clearHistory();

    engine.block.appendChild(groupId, groupId);

    expect(snapshot(groupId)).toEqual(before);
    expect(engine.canUndo()).toBe(false);
  });

  it("rejects moving an ancestor into its descendant", () => {
    const pageId = engine.block.create("page");
    const outerId = engine.block.create("group");
    const innerId = engine.block.create("group");
    engine.block.appendChild(pageId, outerId);
    engine.block.appendChild(outerId, innerId);
    const before = {
      page: snapshot(pageId),
      outer: snapshot(outerId),
      inner: snapshot(innerId),
    };
    engine.clearHistory();

    engine.block.addToGroup(innerId, outerId);

    expect(snapshot(pageId)).toEqual(before.page);
    expect(snapshot(outerId)).toEqual(before.outer);
    expect(snapshot(innerId)).toEqual(before.inner);
    expect(engine.canUndo()).toBe(false);
  });

  it("rejects grouping an ancestor with its descendant before mutation", () => {
    const pageId = engine.block.create("page");
    const outerId = engine.block.create("group");
    const innerId = engine.block.create("group");
    engine.block.appendChild(pageId, outerId);
    engine.block.appendChild(outerId, innerId);
    const before = {
      page: snapshot(pageId),
      outer: snapshot(outerId),
      inner: snapshot(innerId),
    };
    engine.clearHistory();

    expect(() => engine.block.group([innerId, outerId])).toThrow("group(): no group was created");

    expect(snapshot(pageId)).toEqual(before.page);
    expect(snapshot(outerId)).toEqual(before.outer);
    expect(snapshot(innerId)).toEqual(before.inner);
    expect(store().findByType("group")).toEqual([outerId, innerId]);
    expect(engine.canUndo()).toBe(false);
  });

  it("uses rotated member bounds when creating a group", () => {
    const pageId = engine.block.create("page");
    const rotatedId = createGraphic(engine, pageId, 10, 20, 30, 10, 90);
    const plainId = createGraphic(engine, pageId, -5, 8, 4, 2, 0);
    const before = {
      page: snapshot(pageId),
      rotated: snapshot(rotatedId),
      plain: snapshot(plainId),
    };
    const rotatedWorldBefore = absoluteTransformOf(store(), rotatedId);
    const plainWorldBefore = absoluteTransformOf(store(), plainId);
    engine.clearHistory();

    const groupId = engine.block.group([rotatedId, plainId]);
    const grouped = {
      group: snapshot(groupId),
      rotated: snapshot(rotatedId),
      plain: snapshot(plainId),
    };

    expect(engine.block.getFloat(groupId, POSITION_X)).toBeCloseTo(-5);
    expect(engine.block.getFloat(groupId, POSITION_Y)).toBeCloseTo(8);
    expect(engine.block.getFloat(groupId, SIZE_WIDTH)).toBeCloseTo(15);
    expect(engine.block.getFloat(groupId, SIZE_HEIGHT)).toBeCloseTo(42);
    expect(absoluteTransformOf(store(), rotatedId)).toEqual(
      expect.objectContaining({
        x: expect.closeTo(rotatedWorldBefore.x),
        y: expect.closeTo(rotatedWorldBefore.y),
        rotation: expect.closeTo(rotatedWorldBefore.rotation),
      }),
    );
    expect(absoluteTransformOf(store(), plainId)).toEqual(
      expect.objectContaining({
        x: expect.closeTo(plainWorldBefore.x),
        y: expect.closeTo(plainWorldBefore.y),
        rotation: expect.closeTo(plainWorldBefore.rotation),
      }),
    );

    engine.undo();
    expect(snapshot(pageId)).toEqual(before.page);
    expect(snapshot(rotatedId)).toEqual(before.rotated);
    expect(snapshot(plainId)).toEqual(before.plain);

    engine.redo();
    expect(snapshot(groupId)).toEqual(grouped.group);
    expect(snapshot(rotatedId)).toEqual(grouped.rotated);
    expect(snapshot(plainId)).toEqual(grouped.plain);
  });

  it("normalizes duplicate member ids before grouping", () => {
    const pageId = engine.block.create("page");
    const blockId = createGraphic(engine, pageId, 10, 20, 30, 40, 0);
    const worldBefore = absoluteTransformOf(store(), blockId);

    const groupId = engine.block.group([blockId, blockId]);

    expect(store().getChildren(groupId)).toEqual([blockId]);
    expect(absoluteTransformOf(store(), blockId)).toEqual(worldBefore);
  });
});

function createGraphic(
  engine: EditxEngine,
  parentId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
): number {
  const id = engine.block.create("graphic");
  engine.block.appendChild(parentId, id);
  engine.block.setPosition(id, x, y);
  engine.block.setSize(id, width, height);
  engine.block.setRotation(id, rotation);
  return id;
}
