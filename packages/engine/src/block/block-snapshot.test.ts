import { beforeEach, describe, expect, it } from "vitest";
import type { BlockData, Color } from "./block.types";
import { BlockSnapshot } from "./block-snapshot";

function makeBlock(id: number): BlockData {
  return {
    id,
    type: "graphic",
    kind: "",
    name: `block-${id}`,
    parentId: null,
    children: [10, 20],
    effectIds: [],
    shapeId: null,
    fillId: null,
    properties: {
      x: 100,
      fill: { r: 1, g: 0, b: 0, a: 1 } as Color,
    },
  };
}

describe("BlockSnapshot", () => {
  let blocks: Map<number, BlockData>;
  let snapshots: BlockSnapshot;

  beforeEach(() => {
    blocks = new Map();
    snapshots = new BlockSnapshot(blocks);
  });

  describe("snapshot", () => {
    it("returns a deep copy of the block data", () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      const snap = snapshots.snapshot(1);
      expect(snap).not.toBeNull();
      expect(snap!.id).toBe(1);
      expect(snap!.type).toBe("graphic");
      expect(snap!.properties.x).toBe(100);
    });

    it("snapshot children array is a copy", () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      const snap = snapshots.snapshot(1)!;
      snap.children.push(99);
      expect(block.children).toEqual([10, 20]); // original unchanged
    });

    it("snapshot Color properties are copies", () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      const snap = snapshots.snapshot(1)!;
      const snapFill = snap.properties.fill as Color;
      snapFill.r = 0;

      const originalFill = block.properties.fill as Color;
      expect(originalFill.r).toBe(1); // original unchanged
    });

    it("snapshot properties object is a copy", () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      const snap = snapshots.snapshot(1)!;
      snap.properties.newProp = "added";
      expect(block.properties.newProp).toBeUndefined(); // original unchanged
    });

    it("returns null for non-existent block", () => {
      expect(snapshots.snapshot(999)).toBeNull();
    });
  });

  describe("restore", () => {
    it("overwrites block data in the map", () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      const modified: BlockData = {
        id: 1,
        type: "graphic",
        kind: "circle",
        name: "modified",
        parentId: 5,
        children: [30],
        effectIds: [],
        shapeId: null,
        fillId: null,
        properties: { y: 200 },
      };

      snapshots.restore(modified);

      const restored = blocks.get(1)!;
      expect(restored.kind).toBe("circle");
      expect(restored.name).toBe("modified");
      expect(restored.parentId).toBe(5);
      expect(restored.children).toEqual([30]);
      expect(restored.properties.y).toBe(200);
    });

    it("restore creates a deep copy (does not mutate source)", () => {
      const data: BlockData = {
        id: 2,
        type: "text",
        kind: "",
        name: "text-2",
        parentId: null,
        children: [5],
        effectIds: [],
        shapeId: null,
        fillId: null,
        properties: { fill: { r: 0, g: 1, b: 0, a: 1 } as Color },
      };

      snapshots.restore(data);
      const stored = blocks.get(2)!;

      // Mutate the stored version
      stored.children.push(99);
      (stored.properties.fill as Color).r = 0.5;

      // Original data should be unchanged
      expect(data.children).toEqual([5]);
      expect((data.properties.fill as Color).r).toBe(0);
    });

    it("can restore a block that does not yet exist (creates it)", () => {
      const data: BlockData = {
        id: 42,
        type: "image",
        kind: "",
        name: "img-42",
        parentId: null,
        children: [],
        effectIds: [],
        shapeId: null,
        fillId: null,
        properties: {},
      };

      snapshots.restore(data);
      expect(blocks.has(42)).toBe(true);
      expect(blocks.get(42)!.type).toBe("image");
    });
  });

  it("snapshot → restore round-trip preserves data", () => {
    const block = makeBlock(1);
    blocks.set(1, block);

    const snap = snapshots.snapshot(1)!;

    // Destroy original
    blocks.delete(1);
    expect(blocks.has(1)).toBe(false);

    // Restore from snapshot
    snapshots.restore(snap);
    expect(blocks.has(1)).toBe(true);

    const restored = blocks.get(1)!;
    expect(restored.type).toBe("graphic");
    expect(restored.properties.x).toBe(100);
    expect((restored.properties.fill as Color).r).toBe(1);
    expect(restored.children).toEqual([10, 20]);
  });
});
