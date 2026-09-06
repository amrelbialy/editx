import { constrainImageFillCrop } from "../editor/image-fill-crop-math";
import type { ImageFillCrop } from "../editor-types";
import { resizeImageFillCropFrame } from "./konva-image-fill-crop-frame";

export function resolveImageFillCropSet(
  previous: ImageFillCrop,
  incoming: ImageFillCrop,
  source: { width: number; height: number } | undefined,
  blockRotation: number,
): { value: ImageFillCrop; applyPreview: boolean } {
  const frameChanged =
    incoming.x !== previous.x ||
    incoming.y !== previous.y ||
    incoming.width !== previous.width ||
    incoming.height !== previous.height;
  const contentChanged =
    incoming.mode !== previous.mode ||
    incoming.alignment !== previous.alignment ||
    incoming.offsetX !== previous.offsetX ||
    incoming.offsetY !== previous.offsetY ||
    incoming.scale !== previous.scale ||
    incoming.rotation !== previous.rotation ||
    incoming.flipHorizontal !== previous.flipHorizontal ||
    incoming.flipVertical !== previous.flipVertical;
  const candidate =
    frameChanged && !contentChanged && source?.width && source.height
      ? resizeImageFillCropFrame(previous, incoming, source, blockRotation)
      : incoming;
  const value =
    source?.width && source.height
      ? constrainImageFillCrop(candidate, {
          boxWidth: candidate.width,
          boxHeight: candidate.height,
          imageWidth: source.width,
          imageHeight: source.height,
        })
      : candidate;
  return { value, applyPreview: !frameChanged || contentChanged };
}
