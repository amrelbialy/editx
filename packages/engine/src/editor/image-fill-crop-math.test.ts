import { describe, expect, it } from "vitest";
import {
  constrainImageFillCrop,
  getImageFillAlignmentDisplacement,
  getImageFillCropOffsetLimits,
  getImageFillPatternScale,
  panImageFillCrop,
} from "./image-fill-crop-math";

const geometry = {
  boxWidth: 300,
  boxHeight: 100,
  imageWidth: 100,
  imageHeight: 50,
};

describe("getImageFillPatternScale", () => {
  it("distinguishes Crop zoom, canonical Cover, and Fit for unequal ratios", () => {
    expect(getImageFillPatternScale(geometry, "crop", 2, 0)).toEqual({ x: 6, y: 6 });
    expect(getImageFillPatternScale(geometry, "cover", 1, 0)).toEqual({ x: 3, y: 3 });
    expect(getImageFillPatternScale(geometry, "cover", 3, 0)).toEqual({ x: 3, y: 3 });
    expect(getImageFillPatternScale(geometry, "fit", 1, 0)).toEqual({ x: 2, y: 2 });
  });

  it("expands a rotated cover fill enough to cover a non-square frame", () => {
    expect(getImageFillPatternScale(geometry, "cover", 1, 90)).toEqual({ x: 6, y: 6 });
  });

  it("fits the rotated source bounds inside the frame", () => {
    expect(getImageFillPatternScale(geometry, "fit", 1, 90)).toEqual({ x: 1, y: 1 });
  });

  it("uses direct source scale for Tile", () => {
    expect(getImageFillPatternScale(geometry, "tile", 2, 90)).toEqual({ x: 2, y: 2 });
  });
});

describe("crop constraints", () => {
  const cropGeometry = { boxWidth: 100, boxHeight: 100, imageWidth: 200, imageHeight: 100 };
  const crop = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    mode: "crop" as const,
    alignment: "center" as const,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  };

  it.each([0, 45, 90, 27])("uses exact source-space limits at %s degrees", (rotation) => {
    const scale = getImageFillPatternScale(cropGeometry, "cover", 1, rotation).x;
    const radians = (rotation * Math.PI) / 180;
    const expectedX = Math.max(
      0,
      cropGeometry.imageWidth / 2 -
        (Math.abs(Math.cos(radians)) * 100 + Math.abs(Math.sin(radians)) * 100) / (2 * scale),
    );
    const expectedY = Math.max(
      0,
      cropGeometry.imageHeight / 2 -
        (Math.abs(Math.sin(radians)) * 100 + Math.abs(Math.cos(radians)) * 100) / (2 * scale),
    );
    const limits = getImageFillCropOffsetLimits(cropGeometry, 1, rotation);

    expect(limits.x).toBeCloseTo(expectedX);
    expect(limits.y).toBeCloseTo(expectedY);
  });

  it("clamps scale, diagonal offsets, and non-finite input", () => {
    expect(
      constrainImageFillCrop(
        { ...crop, scale: 0.25, offsetX: 999, offsetY: Number.POSITIVE_INFINITY },
        cropGeometry,
      ),
    ).toMatchObject({ scale: 1, offsetX: 50, offsetY: 0 });
  });

  it("reverses drag direction for flips while keeping symmetric bounds", () => {
    const normal = panImageFillCrop(crop, cropGeometry, { x: 20, y: 0 });
    const flipped = panImageFillCrop({ ...crop, flipHorizontal: true }, cropGeometry, {
      x: 20,
      y: 0,
    });

    expect(normal.offsetX).toBe(-20);
    expect(flipped.offsetX).toBe(20);
    expect(Math.abs(normal.offsetX)).toBe(Math.abs(flipped.offsetX));
  });

  it("constrains rotated Crop pan", () => {
    const rotated = {
      ...crop,
      rotation: 30,
      flipHorizontal: true,
    };
    const panned = panImageFillCrop(rotated, cropGeometry, { x: -500, y: 500 });
    const constrained = constrainImageFillCrop(panned, cropGeometry);

    expect(panned).toEqual(constrained);
    expect(panned.offsetX).not.toBe(0);
  });

  it("allows pan only for Crop and Tile", () => {
    const delta = { x: 10_000, y: -10_000 };
    const tile = panImageFillCrop({ ...crop, mode: "tile" }, cropGeometry, delta);

    expect(Math.abs(tile.offsetX)).toBeGreaterThan(1_000);
    expect(panImageFillCrop({ ...crop, mode: "cover" }, cropGeometry, delta)).toEqual({
      ...crop,
      mode: "cover",
    });
    expect(panImageFillCrop({ ...crop, mode: "fit" }, cropGeometry, delta)).toEqual({
      ...crop,
      mode: "fit",
    });
  });
});

describe("automatic alignment", () => {
  const square = { boxWidth: 300, boxHeight: 300, imageWidth: 100, imageHeight: 50 };
  const alignments = [
    ["top-left", 0, -75],
    ["top-center", 0, -75],
    ["top-right", 0, -75],
    ["center-left", 0, 0],
    ["center", 0, 0],
    ["center-right", 0, 0],
    ["bottom-left", 0, 75],
    ["bottom-center", 0, 75],
    ["bottom-right", 0, 75],
  ] as const;

  it.each(alignments)("places Fit at %s against its transformed AABB", (alignment, x, y) => {
    const displacement = getImageFillAlignmentDisplacement(square, "fit", alignment, 0.5);
    expect(displacement.x).toBeCloseTo(x);
    expect(displacement.y).toBeCloseTo(y);
  });

  it("defaults missing alignment to exact center", () => {
    expect(getImageFillAlignmentDisplacement(square, "fit", undefined)).toEqual({ x: 0, y: 0 });
    expect(getImageFillAlignmentDisplacement(square, "cover", undefined)).toEqual({ x: 0, y: 0 });
  });

  it("ignores alignment for Crop and Tile", () => {
    expect(getImageFillAlignmentDisplacement(square, "crop", "top-left")).toEqual({ x: 0, y: 0 });
    expect(getImageFillAlignmentDisplacement(square, "tile", "bottom-right")).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("projects Cover alignment into the rotated coverage parallelogram", () => {
    const displacement = getImageFillAlignmentDisplacement(
      { boxWidth: 240, boxHeight: 120, imageWidth: 160, imageHeight: 100 },
      "cover",
      "top-left",
      1,
      30,
    );
    const radians = Math.PI / 6;
    const localX = Math.cos(radians) * displacement.x + Math.sin(radians) * displacement.y;
    const localY = -Math.sin(radians) * displacement.x + Math.cos(radians) * displacement.y;
    const patternScale = getImageFillPatternScale(
      { boxWidth: 240, boxHeight: 120, imageWidth: 160, imageHeight: 100 },
      "cover",
      1,
      30,
    ).x;
    const limitX = (patternScale * 160 - (Math.cos(radians) * 240 + Math.sin(radians) * 120)) / 2;
    const limitY = (patternScale * 100 - (Math.sin(radians) * 240 + Math.cos(radians) * 120)) / 2;

    expect(Math.abs(localX)).toBeLessThanOrEqual(limitX + 1e-9);
    expect(Math.abs(localY)).toBeLessThanOrEqual(limitY + 1e-9);
  });
});
