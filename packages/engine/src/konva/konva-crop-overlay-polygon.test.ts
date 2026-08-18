import { describe, expect, it } from "vitest";
import { constrainBoxToPolygon } from "./konva-crop-overlay-polygon";

const box = (x: number, y: number, width: number, height: number, rotation = 0) => ({
  x,
  y,
  width,
  height,
  rotation,
});

describe("constrainBoxToPolygon", () => {
  const image = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 80 },
    { x: 0, y: 80 },
  ];

  it("allows inward crop changes", () => {
    expect(constrainBoxToPolygon(box(0, 0, 100, 80), box(20, 10, 60, 50), image, 10)).toEqual(
      box(20, 10, 60, 50),
    );
  });

  it("stops expansion at the rendered image edge", () => {
    const result = constrainBoxToPolygon(box(20, 10, 60, 50), box(-20, -10, 140, 100), image, 10);

    expect(result.x).toBeCloseTo(0, 4);
    expect(result.y).toBeCloseTo(0, 4);
    expect(result.width).toBeCloseTo(100, 4);
    expect(result.height).toBeCloseTo(75, 4);
  });
});
