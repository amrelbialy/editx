import { describe, expect, it } from "vitest";
import { absoluteToLocal, localToAbsolute, unionBBox } from "./group-transform";

describe("group-transform", () => {
  describe("unionBBox", () => {
    it("computes the axis-aligned union of top-left rects", () => {
      const box = unionBBox([
        { x: 10, y: 20, width: 30, height: 40, rotation: 0 },
        { x: 100, y: 5, width: 20, height: 20, rotation: 0 },
      ]);
      expect(box).toEqual({ x: 10, y: 5, width: 110, height: 55 });
    });

    it("returns a zero box for no members", () => {
      expect(unionBBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  describe("absoluteToLocal / localToAbsolute round-trip", () => {
    it("is an identity for an unrotated group (local = abs - origin)", () => {
      const group = { x: 50, y: 40, rotation: 0 };
      const local = absoluteToLocal({ x: 70, y: 100, rotation: 15 }, group);
      expect(local.x).toBeCloseTo(20);
      expect(local.y).toBeCloseTo(60);
      expect(local.rotation).toBeCloseTo(15);

      const abs = localToAbsolute(local, group);
      expect(abs.x).toBeCloseTo(70);
      expect(abs.y).toBeCloseTo(100);
      expect(abs.rotation).toBeCloseTo(15);
    });

    it("round-trips through a rotated group", () => {
      const group = { x: 200, y: 150, rotation: 30 };
      const abs = { x: 260, y: 210, rotation: 45 };
      const local = absoluteToLocal(abs, group);
      const back = localToAbsolute(local, group);
      expect(back.x).toBeCloseTo(abs.x);
      expect(back.y).toBeCloseTo(abs.y);
      expect(back.rotation).toBeCloseTo(abs.rotation);
      // Member rotation is relative to the group.
      expect(local.rotation).toBeCloseTo(15);
    });

    it("places a point on the rotated x-axis of a 90° group", () => {
      const group = { x: 0, y: 0, rotation: 90 };
      // local (10, 0) rotated 90° → absolute (0, 10)
      const abs = localToAbsolute({ x: 10, y: 0, rotation: 0 }, group);
      expect(abs.x).toBeCloseTo(0);
      expect(abs.y).toBeCloseTo(10);
    });
  });
});
