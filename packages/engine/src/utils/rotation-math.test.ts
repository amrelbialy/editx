import { describe, it, expect } from 'vitest';
import {
  getSizeAfterRotation,
  clampRotation,
  normalizeRotation,
  isRightAngle,
  getPageDimsAfterRotation,
} from './rotation-math';

describe('getSizeAfterRotation', () => {
  it('returns same dimensions at 0°', () => {
    const result = getSizeAfterRotation(100, 50, 0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('returns same dimensions at 180°', () => {
    const result = getSizeAfterRotation(100, 50, 180);
    expect(result.width).toBeCloseTo(100, 1);
    expect(result.height).toBeCloseTo(50, 1);
  });

  it('swaps dimensions at 90°', () => {
    const result = getSizeAfterRotation(100, 50, 90);
    expect(result.width).toBeCloseTo(50, 1);
    expect(result.height).toBeCloseTo(100, 1);
  });

  it('swaps dimensions at -90°', () => {
    const result = getSizeAfterRotation(100, 50, -90);
    expect(result.width).toBeCloseTo(50, 1);
    expect(result.height).toBeCloseTo(100, 1);
  });

  it('computes AABB at 45° for a square', () => {
    const result = getSizeAfterRotation(100, 100, 45);
    // Diagonal of a 100x100 square = 100√2 ≈ 141.42
    expect(result.width).toBeCloseTo(141.42, 0);
    expect(result.height).toBeCloseTo(141.42, 0);
  });

  it('computes AABB at 45° for a rectangle', () => {
    const result = getSizeAfterRotation(200, 100, 45);
    // |200*cos45| + |100*sin45| = 200*0.707 + 100*0.707 = 212.13
    // |200*sin45| + |100*cos45| = 200*0.707 + 100*0.707 = 212.13
    expect(result.width).toBeCloseTo(212.13, 0);
    expect(result.height).toBeCloseTo(212.13, 0);
  });

  it('returns larger bounding box at 30°', () => {
    const result = getSizeAfterRotation(200, 100, 30);
    expect(result.width).toBeGreaterThan(200);
    expect(result.height).toBeGreaterThan(100);
  });
});

describe('clampRotation', () => {
  it('returns value within range unchanged', () => {
    expect(clampRotation(45)).toBe(45);
    expect(clampRotation(-90)).toBe(-90);
    expect(clampRotation(0)).toBe(0);
  });

  it('clamps values above 180', () => {
    expect(clampRotation(200)).toBe(180);
    expect(clampRotation(360)).toBe(180);
  });

  it('clamps values below -180', () => {
    expect(clampRotation(-200)).toBe(-180);
    expect(clampRotation(-360)).toBe(-180);
  });

  it('returns boundary values', () => {
    expect(clampRotation(180)).toBe(180);
    expect(clampRotation(-180)).toBe(-180);
  });
});

describe('normalizeRotation', () => {
  it('returns value within range unchanged', () => {
    expect(normalizeRotation(45)).toBe(45);
    expect(normalizeRotation(-90)).toBe(-90);
    expect(normalizeRotation(0)).toBe(0);
  });

  it('wraps 270 to -90', () => {
    expect(normalizeRotation(270)).toBe(-90);
  });

  it('wraps -270 to 90', () => {
    expect(normalizeRotation(-270)).toBe(90);
  });

  it('wraps 360 to 0', () => {
    expect(normalizeRotation(360)).toBe(0);
  });

  it('wraps 540 to 180', () => {
    expect(normalizeRotation(540)).toBe(180);
  });
});

describe('isRightAngle', () => {
  it('returns true for 0, 90, 180, -90', () => {
    expect(isRightAngle(0)).toBe(true);
    expect(isRightAngle(90)).toBe(true);
    expect(isRightAngle(180)).toBe(true);
    expect(isRightAngle(-90)).toBe(true);
    expect(isRightAngle(270)).toBe(true);
  });

  it('returns false for non-90° angles', () => {
    expect(isRightAngle(45)).toBe(false);
    expect(isRightAngle(30)).toBe(false);
    expect(isRightAngle(1)).toBe(false);
  });
});

describe('getPageDimsAfterRotation', () => {
  it('returns same dims at 0°', () => {
    expect(getPageDimsAfterRotation(1080, 720, 0)).toEqual({ width: 1080, height: 720 });
  });

  it('returns same dims at 180°', () => {
    expect(getPageDimsAfterRotation(1080, 720, 180)).toEqual({ width: 1080, height: 720 });
  });

  it('swaps dims at 90°', () => {
    expect(getPageDimsAfterRotation(1080, 720, 90)).toEqual({ width: 720, height: 1080 });
  });

  it('swaps dims at -90°', () => {
    expect(getPageDimsAfterRotation(1080, 720, -90)).toEqual({ width: 720, height: 1080 });
  });

  it('computes AABB for arbitrary angles', () => {
    const result = getPageDimsAfterRotation(100, 50, 45);
    expect(result.width).toBeGreaterThan(100);
    expect(result.height).toBeGreaterThan(50);
  });
});
