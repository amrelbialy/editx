/**
 * Crop math utilities — pure functions for constraining and computing crop rectangles.
 *
 * Adapted from filerobot's TransformersLayer.utils.js (boundDragging / boundResizing)
 * but simplified: no ellipse crop, no lockCropAreaAt, no scaling factor.
 */

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPreset {
  id: string;
  label: string;
  /** Numeric ratio (width / height), or `null` for free crop. */
  ratio: number | null;
}

/**
 * Round floats to avoid drift during repeated resize operations.
 * Matches filerobot's `toPrecisedFloat` utility.
 */
export function toPrecisedFloat(n: number, precision = 5): number {
  return +n.toFixed(precision);
}

/**
 * Compare two aspect ratios with float tolerance.
 */
export function compareRatios(a: number, b: number): boolean {
  return toPrecisedFloat(a) === toPrecisedFloat(b);
}

// ── Preset definitions ──────────────────────────────

export const CROP_PRESETS: CropPreset[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "original", label: "Original", ratio: null }, // filled at runtime
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: toPrecisedFloat(4 / 3) },
  { id: "3:4", label: "3:4", ratio: toPrecisedFloat(3 / 4) },
  { id: "16:9", label: "16:9", ratio: toPrecisedFloat(16 / 9) },
  { id: "9:16", label: "9:16", ratio: toPrecisedFloat(9 / 16) },
];

// ── Constraint functions ────────────────────────────

/**
 * Constrain a crop rectangle so it stays fully inside the image bounds.
 * Returns a new rect (never mutates input).
 */
export function constrainCropToImage(
  crop: CropRect,
  image: { width: number; height: number },
): CropRect {
  let { x, y, width, height } = crop;

  // Clamp dimensions
  width = Math.min(width, image.width);
  height = Math.min(height, image.height);
  width = Math.max(width, 1);
  height = Math.max(height, 1);

  // Clamp position
  x = Math.max(0, Math.min(x, image.width - width));
  y = Math.max(0, Math.min(y, image.height - height));

  return {
    x: toPrecisedFloat(x),
    y: toPrecisedFloat(y),
    width: toPrecisedFloat(width),
    height: toPrecisedFloat(height),
  };
}

/**
 * Apply a ratio preset to a crop rect, keeping it centered within the image bounds.
 *
 * - `ratio = null` → "free" mode, return the crop unchanged.
 * - `ratio = number` → adjust width/height to match, centered in the image.
 *
 * For "Original" preset, caller should pass `imageWidth / imageHeight` as the ratio.
 */
export function applyCropRatio(
  ratio: number | null,
  image: { width: number; height: number },
  currentCrop?: CropRect,
): CropRect {
  // Free: return current crop (or full image)
  if (ratio === null) {
    if (currentCrop) return { ...currentCrop };
    return { x: 0, y: 0, width: image.width, height: image.height };
  }

  // Compute the largest rect with the given ratio that fits inside the image
  let width: number;
  let height: number;

  if (image.width / image.height > ratio) {
    // Image is wider than ratio → height-limited
    height = image.height;
    width = height * ratio;
  } else {
    // Image is taller than ratio → width-limited
    width = image.width;
    height = width / ratio;
  }

  // Center it
  const x = (image.width - width) / 2;
  const y = (image.height - height) / 2;

  return constrainCropToImage({ x, y, width, height }, image);
}

/**
 * Constrain a crop rect during dragging to stay within image bounds.
 * Only adjusts position, not size.
 */
export function boundDragging(
  crop: CropRect,
  image: { width: number; height: number },
): { x: number; y: number } {
  const maxX = image.width - crop.width;
  const maxY = image.height - crop.height;
  return {
    x: toPrecisedFloat(Math.min(Math.max(crop.x, 0), maxX)),
    y: toPrecisedFloat(Math.min(Math.max(crop.y, 0), maxY)),
  };
}

/**
 * Constrain a crop rect during resizing to stay within image bounds,
 * optionally enforcing an aspect ratio.
 *
 * Matches the logic from filerobot's `boundResizing` but simplified
 * (no scaledBy, no min/max width/height, no lockCropAreaAt).
 */
export function boundResizing(
  oldRect: CropRect,
  newRect: CropRect,
  image: { width: number; height: number },
  ratio: number | null,
): CropRect {
  const bounded = { ...newRect };

  // Clamp to image left/top edges
  if (bounded.x < 0) {
    bounded.width = oldRect.x + oldRect.width;
    bounded.x = 0;
  }
  if (bounded.y < 0) {
    bounded.height = oldRect.y + oldRect.height;
    bounded.y = 0;
  }

  // Clamp to image right/bottom edges
  if (bounded.x + bounded.width > image.width) {
    bounded.width = image.width - bounded.x;
  }
  if (bounded.y + bounded.height > image.height) {
    bounded.height = image.height - bounded.y;
  }

  // Minimum size
  bounded.width = Math.max(bounded.width, 1);
  bounded.height = Math.max(bounded.height, 1);

  // Enforce aspect ratio if provided
  if (typeof ratio === "number") {
    const currentRatio = bounded.width / bounded.height;
    if (!compareRatios(currentRatio, ratio)) {
      const ratioedHeight = bounded.width / ratio;
      const ratioedWidth = bounded.height * ratio;

      // Prefer adjusting height; if that would exceed bounds, adjust width instead
      if (bounded.y + ratioedHeight <= image.height) {
        bounded.height = ratioedHeight;
      } else {
        bounded.width = ratioedWidth;
      }
    }
  }

  return {
    x: toPrecisedFloat(bounded.x),
    y: toPrecisedFloat(bounded.y),
    width: toPrecisedFloat(bounded.width),
    height: toPrecisedFloat(bounded.height),
  };
}

/**
 * Map crop coordinates from display space (shown image dimensions)
 * to original image space. Used when exporting / committing the crop.
 */
export function mapCropToOriginal(
  crop: CropRect,
  shownDims: { width: number; height: number },
  originalDims: { width: number; height: number },
): CropRect {
  const scaleX = originalDims.width / shownDims.width;
  const scaleY = originalDims.height / shownDims.height;
  return {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.round(crop.width * scaleX),
    height: Math.round(crop.height * scaleY),
  };
}
