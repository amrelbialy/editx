import type { ImageFillCrop } from "../editor-types";
import type { CropRect } from "../utils/crop-math";
import { clearCropOverlayFlags, expandPageNodeForCrop } from "./konva-crop-helpers";
import type { KonvaRendererBlocks } from "./konva-renderer-blocks";
import type { KonvaRendererContext } from "./konva-renderer-context";

export class KonvaRendererControls {
  constructor(
    private readonly context: KonvaRendererContext,
    private readonly blocks: KonvaRendererBlocks,
  ) {}

  setZoom(zoom: number, animate = false): void {
    this.context.camera.setZoom(zoom, animate);
  }

  getZoom(): number {
    return this.context.camera.getZoom();
  }

  panTo(x: number, y: number): void {
    this.context.camera.panTo(x, y);
  }

  getPan(): { x: number; y: number } {
    return this.context.camera.getPan();
  }

  fitToScreen(opts: { width: number; height: number; padding: number }, animate = false): void {
    if (!this.context.stage) return;
    this.context.camera.fitToScreen(opts, animate);
  }

  centerOnRect(
    rect: { x: number; y: number; width: number; height: number },
    animate = false,
  ): void {
    if (!this.context.stage) return;
    this.context.camera.centerOnRect(rect, animate);
  }

  fitToRect(
    rect: { x: number; y: number; width: number; height: number },
    padding = 24,
    animate = false,
  ): void {
    if (!this.context.stage) return;
    this.context.camera.fitToRect(rect, padding, animate);
  }

  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return this.context.camera.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return this.context.camera.worldToScreen(pt);
  }

  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: {
      rotation: number;
      flipH: boolean;
      flipV: boolean;
      sourceWidth: number;
      sourceHeight: number;
    },
  ): void {
    const context = this.context;
    this.blocks.hideTransformer();
    // expandPageNodeForCrop mutates page nodes on the content layer; the crop
    // overlay itself lives on (and redraws) the UI layer via cropOverlay.show.
    expandPageNodeForCrop(context.nodeMap, blockId, imageRect, transform);
    // Crop mode renders the full original image (imageRect), not the committed
    // crop. Point the camera's pan-clamp bounds at that expanded canvas so the
    // fitToRect(crop) that follows can center the crop instead of being clamped
    // back to the (smaller) committed page size.
    context.camera.setPageSize(imageRect.width, imageRect.height);
    context.cropOverlay.applyViewportScale(context.camera.getZoom());
    context.cropOverlay.show(imageRect, initialCrop);
    context.contentLayer.batchDraw();
  }

  hideCropOverlay(): void {
    const context = this.context;
    context.cropOverlay.hide();
    clearCropOverlayFlags(context.nodeMap);
    // Restore pan-clamp bounds to the committed page size now that the full
    // image is no longer shown.
    if (context.lastPageSize) {
      context.camera.setPageSize(context.lastPageSize.width, context.lastPageSize.height);
    }
  }

  offsetCropChildNodes(childIds: number[], dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const context = this.context;
    for (const childId of childIds) {
      const node = context.nodeMap.get(childId);
      if (node) {
        node.x(node.x() + dx);
        node.y(node.y() + dy);
      }
    }
    context.contentLayer.batchDraw();
  }

  setCropRect(rect: CropRect): void {
    this.context.cropOverlay.setCropRect(rect);
  }

  setCropRatio(ratio: number | null): void {
    this.context.cropOverlay.setRatio(ratio);
  }

  getCropRect(): CropRect | null {
    const overlay = this.context.cropOverlay;
    return overlay.isVisible() ? overlay.getCropRect() : null;
  }

  getCropImageRect(): CropRect | null {
    const overlay = this.context.cropOverlay;
    return overlay.isVisible() ? overlay.getImageRect() : null;
  }

  showImageFillCropPreview(blockId: number, crop: ImageFillCrop): ImageFillCrop | null {
    const context = this.context;
    this.blocks.hideTransformer();
    context.hoverOutline.hide();
    context.selectionRect.visible(false);
    const shown = context.imageFillCrop.show(blockId, crop);
    context.uiLayer.batchDraw();
    return shown;
  }

  setImageFillCropPreview(crop: ImageFillCrop, ratio?: number | null): ImageFillCrop | null {
    return this.context.imageFillCrop.set(crop, ratio);
  }

  hideImageFillCropPreview(): void {
    this.context.imageFillCrop.hide();
    this.context.uiLayer.batchDraw();
  }
}
