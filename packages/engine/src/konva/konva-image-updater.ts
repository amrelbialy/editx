import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import {
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  IMAGE_SRC,
} from "../block/property-keys";
import { loadNodeImage } from "./konva-image-load";
import { applyFilters } from "./konva-node-filters";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export function updateImageNode(
  imgNode: Konva.Image,
  props: Record<string, unknown>,
  width: number,
  height: number,
  stage: Konva.Stage | null,
  webgl: WebGLFilterRenderer | null,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const cropEnabled = (props[CROP_ENABLED] as boolean) ?? false;
  const cropX = (props[CROP_X] as number) ?? 0;
  const cropY = (props[CROP_Y] as number) ?? 0;
  const cropW = (props[CROP_WIDTH] as number) ?? 0;
  const cropH = (props[CROP_HEIGHT] as number) ?? 0;

  if (cropEnabled && cropW > 0 && cropH > 0) {
    imgNode.width(width);
    imgNode.height(height);
    imgNode.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
  } else {
    imgNode.width(width);
    imgNode.height(height);
    imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });
  }

  const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
  const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;
  imgNode.scaleX(flipH ? -1 : 1);
  imgNode.scaleY(flipV ? -1 : 1);
  if (flipH) imgNode.offsetX(width);
  else imgNode.offsetX(0);
  if (flipV) imgNode.offsetY(height);
  else imgNode.offsetY(0);

  const src = (props[IMAGE_SRC] as string) ?? "";
  const srcChanged = src !== "" && imgNode.getAttr("loadedSrc") !== src;
  if (srcChanged) {
    loadNodeImage(imgNode, src, () => {
      if (block) applyFilters(imgNode, block, stage, webgl, resolveBlock);
      else if (imgNode.filters()?.length) imgNode.cache();
      stage?.batchDraw();
    });
  }

  // Only filter synchronously when the source is already loaded. When the src
  // changed, filtering happens inside the load callback above (once the source
  // image actually exists), so WebGL/CPU filtering isn't silently skipped.
  if (block && !srcChanged) {
    applyFilters(imgNode, block, stage, webgl, resolveBlock);
  }
}
