import { describe, it, expect } from 'vitest';
import {
  toPrecisedFloat,
  compareRatios,
  CROP_PRESETS,
  constrainCropToImage,
  applyCropRatio,
  boundDragging,
  boundResizing,
  mapCropToOriginal,
} from './crop-math';

const IMAGE = { width: 800, height: 600 };

// ── toPrecisedFloat ──

describe('toPrecisedFloat', () => {
  it('rounds to default 5 decimal places', () => {
    expect(toPrecisedFloat(1.333333333)).toBe(1.33333);
  });
  it('accepts custom precision', () => {
    expect(toPrecisedFloat(1.23456789, 2)).toBe(1.23);
  });
  it('preserves exact integers', () => {
    expect(toPrecisedFloat(42)).toBe(42);
  });
});

// ── compareRatios ──

describe('compareRatios', () => {
  it('returns true for equal ratios', () => {
    expect(compareRatios(1.33333, 4 / 3)).toBe(true);
  });
  it('returns false for different ratios', () => {
    expect(compareRatios(1.5, 4 / 3)).toBe(false);
  });
  it('handles near-equal floating point values', () => {
    expect(compareRatios(1.77778, 16 / 9)).toBe(true);
  });
});

// ── CROP_PRESETS ──

describe('CROP_PRESETS', () => {
  it('has 7 presets', () => {
    expect(CROP_PRESETS).toHaveLength(7);
  });
  it('has free preset with null ratio', () => {
    expect(CROP_PRESETS[0]).toEqual({ id: 'free', label: 'Free', ratio: null });
  });
  it('has 1:1 preset with ratio 1', () => {
    const p = CROP_PRESETS.find((p) => p.id === '1:1');
    expect(p?.ratio).toBe(1);
  });
});

// ── constrainCropToImage ──

describe('constrainCropToImage', () => {
  it('returns unchanged rect when within bounds', () => {
    const crop = { x: 10, y: 10, width: 100, height: 100 };
    expect(constrainCropToImage(crop, IMAGE)).toEqual(crop);
  });

  it('clamps x/y when crop goes outside left/top', () => {
    const crop = { x: -50, y: -30, width: 100, height: 100 };
    const result = constrainCropToImage(crop, IMAGE);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('clamps x/y when crop goes outside right/bottom', () => {
    const crop = { x: 750, y: 550, width: 100, height: 100 };
    const result = constrainCropToImage(crop, IMAGE);
    expect(result.x).toBe(700); // 800 - 100
    expect(result.y).toBe(500); // 600 - 100
  });

  it('clamps width/height to image dimensions', () => {
    const crop = { x: 0, y: 0, width: 1200, height: 900 };
    const result = constrainCropToImage(crop, IMAGE);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('enforces minimum width/height of 1', () => {
    const crop = { x: 0, y: 0, width: 0, height: -10 };
    const result = constrainCropToImage(crop, IMAGE);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });
});

// ── applyCropRatio ──

describe('applyCropRatio', () => {
  it('free ratio (null) returns current crop unchanged', () => {
    const crop = { x: 10, y: 20, width: 300, height: 200 };
    const result = applyCropRatio(null, IMAGE, crop);
    expect(result).toEqual(crop);
  });

  it('free ratio without current crop returns full image', () => {
    const result = applyCropRatio(null, IMAGE);
    expect(result).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('1:1 ratio on landscape image → height-limited square', () => {
    const result = applyCropRatio(1, IMAGE);
    // 600×600 square, centered horizontally: (800-600)/2 = 100
    expect(result.width).toBe(600);
    expect(result.height).toBe(600);
    expect(result.x).toBe(100);
    expect(result.y).toBe(0);
  });

  it('1:1 ratio on portrait image → width-limited square', () => {
    const portrait = { width: 400, height: 800 };
    const result = applyCropRatio(1, portrait);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    expect(result.x).toBe(0);
    expect(result.y).toBe(200); // (800-400)/2
  });

  it('16:9 ratio on 800×600 landscape', () => {
    const ratio = toPrecisedFloat(16 / 9);
    const result = applyCropRatio(ratio, IMAGE);
    // Image is 4:3, ratio is ~1.778
    // Image wider? 800/600 = 1.333 < 1.778 → width-limited
    // width = 800, height = 800 / 1.778 ≈ 450
    expect(result.width).toBe(800);
    expect(result.height).toBeCloseTo(450, 0);
  });

  it('9:16 ratio (portrait) on landscape image', () => {
    const ratio = toPrecisedFloat(9 / 16);
    const result = applyCropRatio(ratio, IMAGE);
    // 0.5625 ratio → height-limited
    // height = 600, width = 600 * 0.5625 = 337.5
    expect(result.height).toBe(600);
    expect(result.width).toBeCloseTo(337.5, 0);
  });

  it('original ratio produces centered full image', () => {
    const ratio = toPrecisedFloat(800 / 600);
    const result = applyCropRatio(ratio, IMAGE);
    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeCloseTo(600, 0);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeCloseTo(0, 0);
  });
});

// ── boundDragging ──

describe('boundDragging', () => {
  it('returns position unchanged when within bounds', () => {
    const crop = { x: 50, y: 50, width: 200, height: 200 };
    expect(boundDragging(crop, IMAGE)).toEqual({ x: 50, y: 50 });
  });

  it('clamps negative position to 0', () => {
    const crop = { x: -20, y: -10, width: 200, height: 200 };
    const result = boundDragging(crop, IMAGE);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('clamps position so crop stays inside image on right/bottom', () => {
    const crop = { x: 700, y: 500, width: 200, height: 200 };
    const result = boundDragging(crop, IMAGE);
    expect(result.x).toBe(600); // 800 - 200
    expect(result.y).toBe(400); // 600 - 200
  });
});

// ── boundResizing ──

describe('boundResizing', () => {
  const oldRect = { x: 100, y: 100, width: 200, height: 200 };

  it('passes through when new rect is within bounds (no ratio)', () => {
    const newRect = { x: 100, y: 100, width: 250, height: 250 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result).toEqual(newRect);
  });

  it('clamps to left edge', () => {
    const newRect = { x: -30, y: 100, width: 330, height: 200 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result.x).toBe(0);
    expect(result.width).toBe(300); // oldRect.x + oldRect.width
  });

  it('clamps to top edge', () => {
    const newRect = { x: 100, y: -20, width: 200, height: 320 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result.y).toBe(0);
    expect(result.height).toBe(300); // oldRect.y + oldRect.height
  });

  it('clamps to right edge', () => {
    const newRect = { x: 700, y: 100, width: 200, height: 200 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result.width).toBe(100); // 800 - 700
  });

  it('clamps to bottom edge', () => {
    const newRect = { x: 100, y: 500, width: 200, height: 200 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result.height).toBe(100); // 600 - 500
  });

  it('enforces minimum 1px size', () => {
    const newRect = { x: 100, y: 100, width: 0, height: 0 };
    const result = boundResizing(oldRect, newRect, IMAGE, null);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('enforces aspect ratio by adjusting height', () => {
    // 1:1 ratio, but new rect is 300×200 → should adjust height to 300
    const newRect = { x: 100, y: 100, width: 300, height: 200 };
    const result = boundResizing(oldRect, newRect, IMAGE, 1);
    expect(result.width).toBe(300);
    expect(result.height).toBe(300); // adjusted to match 1:1
  });

  it('adjusts width instead of height when height would exceed image', () => {
    // 1:1 ratio: new rect 400×400 at y=300, height 300 → adjust height to 300 (or width)
    const newRect = { x: 100, y: 300, width: 400, height: 300 };
    // height = 300, y=300, y+400=700>600, so height clamps to 300
    // Ratio=1, 400/300 ≠ 1, ratioedHeight = 400, y+400=700 > 600 → adjust width=300*1=300
    const result = boundResizing(oldRect, newRect, IMAGE, 1);
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });
});

// ── mapCropToOriginal ──

describe('mapCropToOriginal', () => {
  it('maps 1:1 when shown and original are identical', () => {
    const crop = { x: 100, y: 50, width: 200, height: 150 };
    const result = mapCropToOriginal(crop, IMAGE, IMAGE);
    expect(result).toEqual(crop);
  });

  it('scales up when original is larger than shown', () => {
    const shown = { width: 400, height: 300 };
    const original = { width: 4000, height: 3000 };
    const crop = { x: 10, y: 20, width: 100, height: 50 };
    const result = mapCropToOriginal(crop, shown, original);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(500);
  });

  it('scales down when original is smaller than shown', () => {
    const shown = { width: 1000, height: 1000 };
    const original = { width: 100, height: 100 };
    const crop = { x: 500, y: 500, width: 500, height: 500 };
    const result = mapCropToOriginal(crop, shown, original);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it('rounds values to integers', () => {
    const shown = { width: 300, height: 300 };
    const original = { width: 1000, height: 1000 };
    const crop = { x: 1, y: 1, width: 1, height: 1 };
    const result = mapCropToOriginal(crop, shown, original);
    // 1 * (1000/300) = 3.333 → 3
    expect(result.x).toBe(3);
    expect(result.width).toBe(3);
  });
});
