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
import { loadImage } from "../utils/image-loader";
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
    imgNode.setAttr("loadedSrc", src);
    // Track the most recent requested src so a stale async load can't clobber
    // a newer one when it resolves out of order.
    imgNode.setAttr("__pendingSrc", src);
    imgNode.setAttr("__imageLoadError", undefined);
    const imageReady = loadImage(src)
      .then((htmlImg) => {
        // Bail if a newer src load superseded this one, or the node was
        // destroyed / detached from the stage while the image was loading.
        if (imgNode.getAttr("__pendingSrc") !== src) return;
        if (!imgNode.getStage()) return;

        imgNode.setAttr("_sourceImage", htmlImg);
        imgNode.image(htmlImg);
        // Re-run filtering now that the real source is loaded — the earlier
        // synchronous call (if any) had no source and would no-op.
        if (block) {
          applyFilters(imgNode, block, stage, webgl, resolveBlock);
        } else if (imgNode.filters()?.length) {
          imgNode.cache();
        }
        stage?.batchDraw();
      })
      .catch((error: unknown) => {
        // Only act on the failure if this is still the pending load for the
        // node (a newer src may have superseded it).
        if (imgNode.getAttr("__pendingSrc") !== src) return;
        // Clear the "loaded" marker so a subsequent sync with the same src
        // retries the load instead of being stuck as "already loaded" with no
        // image. This is a genuine (non-perf) error, surfaced like other
        // user-facing load issues in image-loader.ts.
        if (imgNode.getAttr("loadedSrc") === src) {
          imgNode.setAttr("loadedSrc", undefined);
        }
        imgNode.setAttr("__imageLoadError", error);
        console.error(`[editx] Failed to load image: ${src}`, error);
      });
    imgNode.setAttr("__imageReady", imageReady);
  }

  // Only filter synchronously when the source is already loaded. When the src
  // changed, filtering happens inside the load callback above (once the source
  // image actually exists), so WebGL/CPU filtering isn't silently skipped.
  if (block && !srcChanged) {
    applyFilters(imgNode, block, stage, webgl, resolveBlock);
  }
}
