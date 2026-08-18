import {
  getImageFillPatternScale,
  IMAGE_FILL_CROP_SCALE_MAX,
  IMAGE_FILL_CROP_SCALE_MIN,
  panImageFillCrop,
} from "../editor/image-fill-crop-math";
import type { ImageFillCrop } from "../editor-types";

type CropFrame = Pick<ImageFillCrop, "x" | "y" | "width" | "height">;

export function resizeImageFillCropFrame(
  current: ImageFillCrop,
  frame: CropFrame,
  imageSize: { width: number; height: number },
  blockRotation: number,
): ImageFillCrop {
  const oldGeometry = {
    boxWidth: current.width,
    boxHeight: current.height,
    imageWidth: imageSize.width,
    imageHeight: imageSize.height,
  };
  const newGeometry = { ...oldGeometry, boxWidth: frame.width, boxHeight: frame.height };
  const value = { ...current, ...frame };

  if (value.fit !== "stretch") {
    const oldScale = getImageFillPatternScale(
      oldGeometry,
      value.fit,
      value.scale,
      value.rotation,
    ).x;
    const nextBase = getImageFillPatternScale(newGeometry, value.fit, 1, value.rotation).x;
    value.scale = Math.min(
      IMAGE_FILL_CROP_SCALE_MAX,
      Math.max(IMAGE_FILL_CROP_SCALE_MIN, oldScale / Math.max(nextBase, 0.0001)),
    );
  }

  const oldCenter = { x: current.x + current.width / 2, y: current.y + current.height / 2 };
  const nextCenter = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  const radians = (blockRotation * Math.PI) / 180;
  const dx = nextCenter.x - oldCenter.x;
  const dy = nextCenter.y - oldCenter.y;
  return panImageFillCrop(value, newGeometry, {
    x: -(Math.cos(radians) * dx + Math.sin(radians) * dy),
    y: -(-Math.sin(radians) * dx + Math.cos(radians) * dy),
  });
}
