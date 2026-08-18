import type { ImageFillAlignment, ImageFillFit } from "../block/block.types";
import type { ImageFillCrop } from "../editor-types";

export interface ImageFillCropGeometry {
  boxWidth: number;
  boxHeight: number;
  imageWidth: number;
  imageHeight: number;
}

export const IMAGE_FILL_CROP_SCALE_MIN = 1;
export const IMAGE_FILL_TILE_SCALE_MIN = 0.1;
export const IMAGE_FILL_CROP_SCALE_MAX = 4;

function getRotation(rotation: number): {
  cos: number;
  sin: number;
  absCos: number;
  absSin: number;
} {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { cos, sin, absCos: Math.abs(cos), absSin: Math.abs(sin) };
}

export function getImageFillPatternScale(
  geometry: ImageFillCropGeometry,
  fit: ImageFillFit,
  scale: number,
  rotation = 0,
): { x: number; y: number } {
  const widthScale = geometry.boxWidth / Math.max(geometry.imageWidth, 1);
  const heightScale = geometry.boxHeight / Math.max(geometry.imageHeight, 1);
  if (fit === "stretch") return { x: widthScale * scale, y: heightScale * scale };
  if (fit === "tile") return { x: scale, y: scale };
  const { absCos, absSin } = getRotation(rotation);
  const rotatedWidth = absCos * geometry.imageWidth + absSin * geometry.imageHeight;
  const rotatedHeight = absSin * geometry.imageWidth + absCos * geometry.imageHeight;
  const base =
    fit === "cover"
      ? Math.max(
          (absCos * geometry.boxWidth + absSin * geometry.boxHeight) / geometry.imageWidth,
          (absSin * geometry.boxWidth + absCos * geometry.boxHeight) / geometry.imageHeight,
        )
      : Math.min(geometry.boxWidth / rotatedWidth, geometry.boxHeight / rotatedHeight);
  return { x: base * scale, y: base * scale };
}

export function getImageFillCropOffsetLimits(
  geometry: ImageFillCropGeometry,
  scale: number,
  rotation = 0,
): { x: number; y: number } {
  const absoluteScale = Math.abs(getImageFillPatternScale(geometry, "cover", scale, rotation).x);
  const { absCos, absSin } = getRotation(rotation);
  const qx =
    (absCos * geometry.boxWidth + absSin * geometry.boxHeight) /
    (2 * Math.max(absoluteScale, Number.EPSILON));
  const qy =
    (absSin * geometry.boxWidth + absCos * geometry.boxHeight) /
    (2 * Math.max(absoluteScale, Number.EPSILON));
  return {
    x: Math.max(0, geometry.imageWidth / 2 - qx),
    y: Math.max(0, geometry.imageHeight / 2 - qy),
  };
}

export function constrainImageFillCrop(
  value: ImageFillCrop,
  geometry: ImageFillCropGeometry,
): ImageFillCrop {
  if (value.fit !== "cover") return value;
  const scale = Math.min(
    IMAGE_FILL_CROP_SCALE_MAX,
    Math.max(IMAGE_FILL_CROP_SCALE_MIN, value.scale),
  );
  const limits = getImageFillCropOffsetLimits(geometry, scale, value.rotation);
  const patternScale = getImageFillPatternScale(geometry, "cover", scale, value.rotation).x;
  const alignment = getImageFillAlignmentDisplacement(
    geometry,
    "cover",
    value.alignment,
    scale,
    value.rotation,
  );
  const { cos, sin } = getRotation(value.rotation);
  const alignedSourceX = (cos * alignment.x + sin * alignment.y) / patternScale;
  const alignedSourceY = (-sin * alignment.x + cos * alignment.y) / patternScale;
  const signX = value.flipHorizontal ? -1 : 1;
  const signY = value.flipVertical ? -1 : 1;
  const offsetX = Number.isFinite(value.offsetX) ? value.offsetX : 0;
  const offsetY = Number.isFinite(value.offsetY) ? value.offsetY : 0;
  const centerX = Math.min(limits.x, Math.max(-limits.x, alignedSourceX - signX * offsetX));
  const centerY = Math.min(limits.y, Math.max(-limits.y, alignedSourceY - signY * offsetY));
  return {
    ...value,
    scale,
    offsetX: (alignedSourceX - centerX) / signX,
    offsetY: (alignedSourceY - centerY) / signY,
  };
}

function getAlignmentAxis(alignment: ImageFillAlignment): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  const x = alignment.endsWith("left") ? 1 : alignment.endsWith("right") ? -1 : 0;
  const y = alignment.startsWith("top") ? 1 : alignment.startsWith("bottom") ? -1 : 0;
  return { x, y };
}

export function getImageFillAlignmentDisplacement(
  geometry: ImageFillCropGeometry,
  fit: ImageFillFit,
  alignment: ImageFillAlignment = "center",
  scale = 1,
  rotation = 0,
): { x: number; y: number } {
  if (fit !== "cover" && fit !== "contain") return { x: 0, y: 0 };
  const patternScale = getImageFillPatternScale(geometry, fit, scale, rotation).x;
  const { cos, sin, absCos, absSin } = getRotation(rotation);
  const imageHalfWidth =
    (patternScale * (absCos * geometry.imageWidth + absSin * geometry.imageHeight)) / 2;
  const imageHalfHeight =
    (patternScale * (absSin * geometry.imageWidth + absCos * geometry.imageHeight)) / 2;
  const axis = getAlignmentAxis(alignment);
  const requested = {
    x: axis.x * (imageHalfWidth - geometry.boxWidth / 2),
    y: axis.y * (imageHalfHeight - geometry.boxHeight / 2),
  };
  if (axis.x === 0 && axis.y === 0) return { x: 0, y: 0 };
  if (fit === "contain") return requested;

  const localX = cos * requested.x + sin * requested.y;
  const localY = -sin * requested.x + cos * requested.y;
  const limitX = Math.max(
    0,
    (patternScale * geometry.imageWidth -
      (absCos * geometry.boxWidth + absSin * geometry.boxHeight)) /
      2,
  );
  const limitY = Math.max(
    0,
    (patternScale * geometry.imageHeight -
      (absSin * geometry.boxWidth + absCos * geometry.boxHeight)) /
      2,
  );
  const projectedX = Math.min(limitX, Math.max(-limitX, localX));
  const projectedY = Math.min(limitY, Math.max(-limitY, localY));
  return {
    x: cos * projectedX - sin * projectedY,
    y: sin * projectedX + cos * projectedY,
  };
}

export function panImageFillCrop(
  value: ImageFillCrop,
  geometry: ImageFillCropGeometry,
  localDelta: { x: number; y: number },
): ImageFillCrop {
  if (value.fit !== "cover" && value.fit !== "tile") return value;
  const patternScale = getImageFillPatternScale(geometry, value.fit, value.scale, value.rotation);
  const { cos, sin } = getRotation(value.rotation);
  const rotatedX = cos * localDelta.x + sin * localDelta.y;
  const rotatedY = -sin * localDelta.x + cos * localDelta.y;
  const scaleX = patternScale.x * (value.flipHorizontal ? -1 : 1);
  const scaleY = patternScale.y * (value.flipVertical ? -1 : 1);
  const next = {
    ...value,
    offsetX: value.offsetX - rotatedX / scaleX,
    offsetY: value.offsetY - rotatedY / scaleY,
  };
  return constrainImageFillCrop(next, geometry);
}
