import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";

/** Position the 4 dark rects around the cutout hole. */
export function layoutDarkRects(
  imageRect: CropRect,
  cutoutRect: CropRect,
  darkTop: Konva.Rect,
  darkBottom: Konva.Rect,
  darkLeft: Konva.Rect,
  darkRight: Konva.Rect,
): void {
  darkTop.setAttrs({
    x: imageRect.x,
    y: imageRect.y,
    width: imageRect.width,
    height: Math.max(0, cutoutRect.y - imageRect.y),
  });

  const cutBottom = cutoutRect.y + cutoutRect.height;
  darkBottom.setAttrs({
    x: imageRect.x,
    y: cutBottom,
    width: imageRect.width,
    height: Math.max(0, imageRect.y + imageRect.height - cutBottom),
  });

  darkLeft.setAttrs({
    x: imageRect.x,
    y: cutoutRect.y,
    width: Math.max(0, cutoutRect.x - imageRect.x),
    height: cutoutRect.height,
  });

  const cutRight = cutoutRect.x + cutoutRect.width;
  darkRight.setAttrs({
    x: cutRight,
    y: cutoutRect.y,
    width: Math.max(0, imageRect.x + imageRect.width - cutRight),
    height: cutoutRect.height,
  });
}

/** Position rule-of-thirds grid lines inside the crop rect. */
export function layoutGridLines(cutoutRect: CropRect, lines: Konva.Line[]): void {
  if (lines.length < 4) return;
  const thirdW = cutoutRect.width / 3;
  const thirdH = cutoutRect.height / 3;
  const { x, y, width, height } = cutoutRect;

  lines[0].points([x + thirdW, y, x + thirdW, y + height]);
  lines[1].points([x + thirdW * 2, y, x + thirdW * 2, y + height]);
  lines[2].points([x, y + thirdH, x + width, y + thirdH]);
  lines[3].points([x, y + thirdH * 2, x + width, y + thirdH * 2]);
}

/** Clamp a dragged cutout position within image bounds. */
export function clampCutoutPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  imageRect: CropRect,
): { x: number; y: number } {
  return {
    x: Math.max(imageRect.x, Math.min(x, imageRect.x + imageRect.width - w)),
    y: Math.max(imageRect.y, Math.min(y, imageRect.y + imageRect.height - h)),
  };
}

/** Normalize cutout after transform — resolve scale, clamp to bounds, enforce ratio. */
export function normalizeCutoutTransform(
  x: number,
  y: number,
  width: number,
  height: number,
  imageRect: CropRect,
  ratio: number | null,
): CropRect {
  const { x: cx, y: cy } = clampCutoutPosition(x, y, width, height, imageRect);
  let w = Math.min(width, imageRect.x + imageRect.width - cx);
  let h = Math.min(height, imageRect.y + imageRect.height - cy);

  if (ratio !== null) {
    const currentRatio = w / h;
    if (currentRatio > ratio) {
      w = h * ratio;
    } else if (currentRatio < ratio) {
      h = w / ratio;
    }
  }

  return { x: cx, y: cy, width: w, height: h };
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** boundBoxFunc for the crop transformer — constrains resize within image bounds. */
export function cropBoundBoxFunc(
  imageRect: CropRect,
  ratio: number | null,
  oldBox: Box,
  newBox: Box,
): Box {
  const imgX = imageRect.x;
  const imgY = imageRect.y;
  const imgRight = imgX + imageRect.width;
  const imgBottom = imgY + imageRect.height;
  const minSize = 10;

  if (newBox.width < minSize || newBox.height < minSize) return oldBox;

  if (ratio !== null) {
    let { x, y, width, height } = newBox;
    if (x < imgX) {
      width -= imgX - x;
      x = imgX;
      height = width / ratio;
    }
    if (y < imgY) {
      height -= imgY - y;
      y = imgY;
      width = height * ratio;
    }
    if (x + width > imgRight) {
      width = imgRight - x;
      height = width / ratio;
    }
    if (y + height > imgBottom) {
      height = imgBottom - y;
      width = height * ratio;
    }
    if (width < minSize || height < minSize) return oldBox;
    return { ...newBox, x, y, width, height };
  }

  if (newBox.x < imgX) {
    newBox.width -= imgX - newBox.x;
    newBox.x = imgX;
  }
  if (newBox.y < imgY) {
    newBox.height -= imgY - newBox.y;
    newBox.y = imgY;
  }
  if (newBox.x + newBox.width > imgRight) newBox.width = imgRight - newBox.x;
  if (newBox.y + newBox.height > imgBottom) newBox.height = imgBottom - newBox.y;

  return newBox;
}
