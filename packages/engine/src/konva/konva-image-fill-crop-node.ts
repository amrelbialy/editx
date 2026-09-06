import Konva from "konva";
import type { ImageFillCropGeometry } from "../editor/image-fill-crop-math";
import type { ImageFillCrop } from "../editor-types";
import { isCenterOriginNode } from "./konva-node-handlers";

type PatternSource = HTMLImageElement | HTMLCanvasElement;
type CropFrame = Pick<ImageFillCrop, "x" | "y" | "width" | "height">;

export function getImageFillCropGeometry(node: Konva.Shape): ImageFillCropGeometry | null {
  const source = node.getAttr("__fillPatternSource") as PatternSource | undefined;
  if (!source?.width || !source.height) return null;
  const box = node.getSelfRect();
  return {
    boxWidth: box.width,
    boxHeight: box.height,
    imageWidth: source.width,
    imageHeight: source.height,
  };
}

export function getImageFillCropLocalPointer(
  stage: Konva.Stage,
  node: Konva.Shape,
): { x: number; y: number } | null {
  const pointer = stage.getPointerPosition();
  return pointer ? node.getAbsoluteTransform().copy().invert().point(pointer) : null;
}

export function setImageFillCropNodeFrame(node: Konva.Shape, frame: CropFrame): void {
  node.position(
    isCenterOriginNode(node)
      ? { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 }
      : { x: frame.x, y: frame.y },
  );
}

export function isImageFillCropDismissTarget(target: Konva.Node): boolean {
  let current: Konva.Node | null = target;
  while (current) {
    if (current instanceof Konva.Transformer || current.name() === "crop-frame-proxy") return false;
    current = current.getParent();
  }
  return true;
}

export function isPointInImageFillPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[] | null,
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}
