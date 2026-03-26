import type { RendererAdapter } from "../render-adapter";
import type { CropRect } from "../utils/crop-math";

/**
 * Compute the largest rect with the given ratio that fits within the image
 * bounds, centered on the current crop center.
 */
export function applyCropRatioToOverlay(
  renderer: RendererAdapter,
  ratio: number | null,
): CropRect | null {
  const imageRect = renderer.getCropImageRect();
  if (!imageRect) return null;

  renderer.setCropRatio(ratio);
  if (ratio === null) return renderer.getCropRect();

  const currentCrop = renderer.getCropRect();
  if (!currentCrop) return null;

  let newWidth: number;
  let newHeight: number;

  if (imageRect.width / imageRect.height > ratio) {
    newHeight = imageRect.height;
    newWidth = newHeight * ratio;
  } else {
    newWidth = imageRect.width;
    newHeight = newWidth / ratio;
  }

  const currentCenterX = currentCrop.x + currentCrop.width / 2;
  const currentCenterY = currentCrop.y + currentCrop.height / 2;

  let newX = currentCenterX - newWidth / 2;
  let newY = currentCenterY - newHeight / 2;

  if (newX < imageRect.x) newX = imageRect.x;
  if (newY < imageRect.y) newY = imageRect.y;
  if (newX + newWidth > imageRect.x + imageRect.width) {
    newX = imageRect.x + imageRect.width - newWidth;
  }
  if (newY + newHeight > imageRect.y + imageRect.height) {
    newY = imageRect.y + imageRect.height - newHeight;
  }

  const newCrop: CropRect = { x: newX, y: newY, width: newWidth, height: newHeight };
  renderer.setCropRect(newCrop);
  renderer.fitToRect(newCrop, 24);
  return newCrop;
}

/**
 * Apply exact pixel dimensions to the crop overlay, clamping to image bounds
 * while preserving the requested aspect ratio.
 */
export function applyCropDimensionsToOverlay(
  renderer: RendererAdapter,
  width: number,
  height: number,
): CropRect | null {
  const imageRect = renderer.getCropImageRect();
  if (!imageRect) return null;

  let w = Math.max(1, Math.round(width));
  let h = Math.max(1, Math.round(height));

  if (w > imageRect.width || h > imageRect.height) {
    const ratio = w / h;
    if (imageRect.width / imageRect.height > ratio) {
      h = Math.round(Math.min(h, imageRect.height));
      w = Math.round(h * ratio);
    } else {
      w = Math.round(Math.min(w, imageRect.width));
      h = Math.round(w / ratio);
    }
  }

  renderer.setCropRatio(w / h);

  const currentCrop = renderer.getCropRect();
  if (!currentCrop) return null;

  const cx = currentCrop.x + currentCrop.width / 2;
  const cy = currentCrop.y + currentCrop.height / 2;
  let newX = cx - w / 2;
  let newY = cy - h / 2;

  if (newX < imageRect.x) newX = imageRect.x;
  if (newY < imageRect.y) newY = imageRect.y;
  if (newX + w > imageRect.x + imageRect.width) {
    newX = imageRect.x + imageRect.width - w;
  }
  if (newY + h > imageRect.y + imageRect.height) {
    newY = imageRect.y + imageRect.height - h;
  }

  const newCrop: CropRect = { x: newX, y: newY, width: w, height: h };
  renderer.setCropRect(newCrop);
  renderer.fitToRect(newCrop, 24);
  return newCrop;
}

export function getCropVisualDims(
  renderer: RendererAdapter,
): { width: number; height: number } | null {
  const rect = renderer.getCropRect();
  if (!rect) return null;
  return { width: Math.round(rect.width), height: Math.round(rect.height) };
}
