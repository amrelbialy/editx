import Konva from "konva";
import type { BlockData } from "../block/block.types";
import { POSITION_X, POSITION_Y, SIZE_HEIGHT, SIZE_WIDTH } from "../block/property-keys";
import type { ImageFillCrop } from "../editor-types";
import { invalidatePendingImageFill } from "./konva-image-fill";
import type { KonvaNodeFactory } from "./konva-node-factory";

export interface ImageFillCropPreview {
  group: Konva.Group;
  plane: Konva.Image;
  node: Konva.Shape;
  sourceNode: Konva.Shape;
  sourceVisible: boolean;
}

export function createImageFillCropPreview(sourceNode: Konva.Shape): ImageFillCropPreview | null {
  const parent = sourceNode.getParent();
  if (!parent) return null;
  const sourceVisible = sourceNode.visible();
  const group = new Konva.Group({ name: "image-fill-crop-preview" });
  const plane = new Konva.Image({
    name: "image-fill-crop-plane",
    image: undefined as unknown as CanvasImageSource,
    listening: false,
  });
  const node = sourceNode.clone() as Konva.Shape;
  node.off();
  node.name("image-fill-crop-aperture");
  node.draggable(false);
  node.listening(true);
  node.visible(true);
  makeImageFillCropApertureTransparent(node);
  group.add(plane, node);
  parent.add(group);
  group.zIndex(sourceNode.zIndex());
  sourceNode.visible(false);
  const preview = { group, plane, node, sourceNode, sourceVisible };
  syncImageFillCropPreviewPlane(preview);
  return preview;
}

export function destroyImageFillCropPreview(preview: ImageFillCropPreview): void {
  preview.group.destroy();
  preview.sourceNode.visible(preview.sourceVisible);
  preview.sourceNode.getLayer()?.batchDraw();
}

export function applyImageFillCropPreviewFrame(
  nodeFactory: KonvaNodeFactory,
  resolveBlock: ((id: number) => BlockData | undefined) | undefined,
  blockId: number,
  frame: Pick<ImageFillCrop, "x" | "y" | "width" | "height">,
  preview: ImageFillCropPreview,
): void {
  const block = resolveBlock?.(blockId);
  if (!block) return;
  nodeFactory.updateNode(
    preview.node,
    {
      ...block,
      properties: {
        ...block.properties,
        [POSITION_X]: frame.x,
        [POSITION_Y]: frame.y,
        [SIZE_WIDTH]: frame.width,
        [SIZE_HEIGHT]: frame.height,
      },
    },
    resolveBlock,
  );
  invalidatePendingImageFill(preview.node);
  makeImageFillCropApertureTransparent(preview.node);
}

export function syncImageFillCropPreviewPlane(preview: ImageFillCropPreview): void {
  const { node, plane } = preview;
  const source = node.fillPatternImage();
  if (!source) return;
  const offset = node.fillPatternOffset();
  const scale = node.fillPatternScale();
  const pattern = new Konva.Transform();
  pattern.translate(node.fillPatternX(), node.fillPatternY());
  pattern.rotate((node.fillPatternRotation() * Math.PI) / 180);
  pattern.scale(scale.x, scale.y);
  pattern.translate(-offset.x, -offset.y);
  if (node.getAttr("__fillPatternFit") === "tile") {
    plane.visible(false);
    node.fillPriority("pattern");
    node.fillPatternRepeat("repeat");
    return;
  }
  makeImageFillCropApertureTransparent(node);
  plane.visible(true);
  const transform = node.getTransform().copy().multiply(pattern).decompose();
  plane.setAttrs({
    ...transform,
    offsetX: 0,
    offsetY: 0,
    width: source.width,
    height: source.height,
    image: source,
    opacity: node.opacity(),
    globalCompositeOperation: node.globalCompositeOperation(),
  });
}

export function getImageFillCropPreviewPolygon(
  preview: ImageFillCropPreview,
): { x: number; y: number }[] | null {
  const { plane } = preview;
  if (
    preview.node.getAttr("__fillPatternFit") === "tile" ||
    !plane.image() ||
    plane.width() <= 0 ||
    plane.height() <= 0
  )
    return null;
  const transform = plane.getAbsoluteTransform();
  return [
    transform.point({ x: 0, y: 0 }),
    transform.point({ x: plane.width(), y: 0 }),
    transform.point({ x: plane.width(), y: plane.height() }),
    transform.point({ x: 0, y: plane.height() }),
  ];
}

function makeImageFillCropApertureTransparent(node: Konva.Shape): void {
  node.fill("rgba(0,0,0,0)");
  node.fillPriority("color");
  node.fillEnabled(true);
  node.strokeEnabled(false);
  node.shadowEnabled(false);
}
