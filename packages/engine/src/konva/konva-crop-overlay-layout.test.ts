import { describe, expect, it } from "vitest";
import { absBoxToWorld, cropBoundBoxFunc, worldBoxToAbs } from "./konva-crop-overlay-layout";

const box = (x: number, y: number, width: number, height: number, rotation = 0) => ({
  x,
  y,
  width,
  height,
  rotation,
});

describe("absBoxToWorld / worldBoxToAbs", () => {
  it("is identity at zoom=1, pan=0", () => {
    const b = box(10, 20, 100, 50);
    expect(absBoxToWorld(b, 1, { x: 0, y: 0 })).toEqual(b);
    expect(worldBoxToAbs(b, 1, { x: 0, y: 0 })).toEqual(b);
  });

  it("converts world → absolute by applying zoom and pan", () => {
    // world (10,20,100,50) shown at zoom 2, pan (30,40) → abs (50,80,200,100)
    const world = box(10, 20, 100, 50);
    const abs = worldBoxToAbs(world, 2, { x: 30, y: 40 });
    expect(abs).toEqual(box(50, 80, 200, 100));
    expect(absBoxToWorld(abs, 2, { x: 30, y: 40 })).toEqual(world);
  });

  it("round-trips for arbitrary zoom/pan", () => {
    const world = box(-15, 7.5, 42, 33);
    const abs = worldBoxToAbs(world, 0.35, { x: -12, y: 88 });
    const back = absBoxToWorld(abs, 0.35, { x: -12, y: 88 });
    expect(back.x).toBeCloseTo(world.x, 6);
    expect(back.y).toBeCloseTo(world.y, 6);
    expect(back.width).toBeCloseTo(world.width, 6);
    expect(back.height).toBeCloseTo(world.height, 6);
  });
});

describe("cropBoundBoxFunc (world space)", () => {
  const imageRect = { x: 0, y: 0, width: 800, height: 600 };

  it("clamps a box that overflows the right/bottom edges", () => {
    const result = cropBoundBoxFunc(imageRect, null, box(0, 0, 400, 300), box(600, 400, 400, 300));
    expect(result.x).toBe(600);
    expect(result.y).toBe(400);
    expect(result.width).toBe(200); // 800 - 600
    expect(result.height).toBe(200); // 600 - 400
  });

  it("clamps a box that overflows the top/left edges", () => {
    const result = cropBoundBoxFunc(
      imageRect,
      null,
      box(50, 50, 200, 200),
      box(-40, -30, 200, 200),
    );
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(160); // 200 - 40
    expect(result.height).toBe(170); // 200 - 30
  });

  it("rejects boxes below the minimum size", () => {
    const old = box(0, 0, 400, 300);
    expect(cropBoundBoxFunc(imageRect, null, old, box(0, 0, 5, 300))).toBe(old);
  });

  it("preserves ratio while clamping", () => {
    const result = cropBoundBoxFunc(imageRect, 2, box(0, 0, 400, 200), box(700, 0, 400, 200));
    expect(result.width / result.height).toBeCloseTo(2, 5);
    expect(result.x + result.width).toBeLessThanOrEqual(800.0001);
  });

  it("clamps correctly after abs→world conversion under zoom/pan", () => {
    // Simulate Konva feeding an absolute box under zoom=2, pan=(100,50).
    const scale = 2;
    const pan = { x: 100, y: 50 };
    const oldAbs = worldBoxToAbs(box(0, 0, 400, 300), scale, pan);
    const newAbs = worldBoxToAbs(box(600, 400, 400, 300), scale, pan);
    const world = cropBoundBoxFunc(
      imageRect,
      null,
      absBoxToWorld(oldAbs, scale, pan),
      absBoxToWorld(newAbs, scale, pan),
    );
    const backAbs = worldBoxToAbs(world, scale, pan);
    // World-space result clamped to image bounds
    expect(world.width).toBe(200);
    expect(world.height).toBe(200);
    // Absolute result is consistent with the applied camera transform
    expect(backAbs.x).toBe(600 * scale + pan.x);
    expect(backAbs.width).toBe(200 * scale);
  });
});
