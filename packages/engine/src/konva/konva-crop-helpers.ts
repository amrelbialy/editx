import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";

/**
 * Expands a page node to show the full original image for crop editing.
 * While the crop overlay is active, the image is shown uncropped with its
 * rotation and flip transforms applied so the user can reposition the crop.
 */
export function expandPageNodeForCrop(
  nodeMap: Map<number, Konva.Node>,
  blockId: number,
  imageRect: CropRect,
  transform?: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    sourceWidth: number;
    sourceHeight: number;
  },
): void {
  const pageNode = nodeMap.get(blockId);
  if (!pageNode?.getAttr("isPage")) return;

  const group = pageNode as Konva.Group;
  const bgRect = group.children[0] as Konva.Rect;
  const imgNode = group.children[1] as Konva.Image;

  if (imgNode.visible()) {
    const rotation = transform?.rotation ?? 0;
    const flipH = transform?.flipH ?? false;
    const flipV = transform?.flipV ?? false;
    const sourceW = transform?.sourceWidth ?? imageRect.width;
    const sourceH = transform?.sourceHeight ?? imageRect.height;

    imgNode.rotation(rotation);
    imgNode.scaleX(flipH ? -1 : 1);
    imgNode.scaleY(flipV ? -1 : 1);

    imgNode.width(sourceW);
    imgNode.height(sourceH);
    imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });

    imgNode.offsetX(sourceW / 2);
    imgNode.offsetY(sourceH / 2);
    imgNode.x(imageRect.width / 2);
    imgNode.y(imageRect.height / 2);
  }

  bgRect.width(imageRect.width);
  bgRect.height(imageRect.height);

  pageNode.setAttr("_cropOverlayActive", true);
}

export function clearCropOverlayFlags(nodeMap: Map<number, Konva.Node>): void {
  nodeMap.forEach((node) => {
    if (node.getAttr("_cropOverlayActive")) {
      node.setAttr("_cropOverlayActive", false);
    }
  });
}
