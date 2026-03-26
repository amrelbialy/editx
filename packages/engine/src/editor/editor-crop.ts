import {
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  IMAGE_ROTATION,
} from "../block/property-keys";
import type { CropRect } from "../utils/crop-math";
import {
  getSizeAfterRotation,
  sourceCropToVisual,
  visualCropToSource,
} from "../utils/rotation-math";
import type { EditorContext } from "./editor-context";
import { commitCropToBlock, getBlockImageDimensions, resetCropBlock } from "./editor-crop-commit";
import {
  applyCropDimensionsToOverlay,
  applyCropRatioToOverlay,
  getCropVisualDims,
} from "./editor-crop-operations";

/** Internal crop module — manages the crop overlay lifecycle and auto-commit. */
export class EditorCrop {
  #ctx: EditorContext;

  /** Block currently being cropped (set when entering Crop mode). */
  #cropBlockId: number | null = null;

  /** Rotation/flip/source-dims snapshot taken when the overlay was last (re-)shown. */
  #cropTransform: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    sourceWidth: number;
    sourceHeight: number;
  } | null = null;

  /** Snapshot of block crop properties when entering crop mode, used to detect no-op commits. */
  #initialCropState: {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  constructor(ctx: EditorContext) {
    this.#ctx = ctx;
  }

  // ─── Crop Mode Setup / Teardown ───────────────────────

  /**
   * Set up the crop overlay for the given block.
   *
   * Uses the original image dimensions (IMAGE_ORIGINAL_WIDTH/HEIGHT) as the
   * full image rect so that re-entering crop mode after a previous crop allows
   * the user to expand/adjust freely within the original bounds.
   * Falls back to PAGE_WIDTH/HEIGHT (or SIZE_WIDTH/HEIGHT) if originals are not set.
   */
  setupCropOverlay(blockId: number): CropRect | null {
    const store = this.#ctx.engine.getBlockStore();
    const block = store.get(blockId);
    if (!block) return null;

    this.#cropBlockId = blockId;
    const { imgW, imgH } = getBlockImageDimensions(store, blockId);
    const rotation = store.getFloat(blockId, IMAGE_ROTATION);
    const flipH = store.getBool(blockId, CROP_FLIP_HORIZONTAL);
    const flipV = store.getBool(blockId, CROP_FLIP_VERTICAL);

    // Compute visual (post-rotation) full-image bounds
    const { width: visualW, height: visualH } = getSizeAfterRotation(imgW, imgH, rotation);
    const imageRect: CropRect = { x: 0, y: 0, width: visualW, height: visualH };

    // Existing crop is stored in source space — transform to visual space
    const cropEnabled = store.getBool(blockId, CROP_ENABLED);
    const cropX = store.getFloat(blockId, CROP_X);
    const cropY = store.getFloat(blockId, CROP_Y);
    const cropW = store.getFloat(blockId, CROP_WIDTH);
    const cropH = store.getFloat(blockId, CROP_HEIGHT);

    let initialCrop: CropRect | undefined;
    if (cropEnabled && cropW > 0 && cropH > 0) {
      initialCrop = sourceCropToVisual(
        { x: cropX, y: cropY, width: cropW, height: cropH },
        imgW,
        imgH,
        rotation,
        flipH,
        flipV,
      );
    }

    const transform = { rotation, flipH, flipV, sourceWidth: imgW, sourceHeight: imgH };
    this.#cropTransform = transform;

    this.#initialCropState = {
      enabled: cropEnabled,
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH,
    };

    this.#ctx.renderer?.showCropOverlay(blockId, imageRect, initialCrop, transform);

    // Fit the camera to the crop area (or the full image when no crop exists)
    const fitRect = initialCrop ?? imageRect;
    this.#ctx.renderer?.fitToRect(fitRect, 24);

    return initialCrop ?? imageRect;
  }

  /** Tear down the crop overlay — auto-commits before hiding. */
  teardownCropOverlay(): void {
    this.#commitCropToBlock();

    const blockId = this.#cropBlockId;
    this.#ctx.renderer?.hideCropOverlay();
    // Re-sync the block to restore the Konva node from any temporary
    // visual changes made during crop mode (e.g. page expansion).
    if (blockId !== null) {
      const store = this.#ctx.engine.getBlockStore();
      const block = store.get(blockId);
      if (block) {
        this.#ctx.renderer?.syncBlock(blockId, block);
      }
    }
    this.#cropBlockId = null;
    this.#cropTransform = null;
    this.#initialCropState = null;
  }

  // ─── Internal Commit ──────────────────────────────────

  #commitCropToBlock(): CropRect | null {
    const id = this.#cropBlockId;
    if (id === null) return null;
    const visualRect = this.#ctx.renderer?.getCropRect() ?? null;
    if (!visualRect) return null;
    const store = this.#ctx.engine.getBlockStore();
    return commitCropToBlock(this.#ctx.engine, store, id, visualRect, this.#initialCropState);
  }

  /** Get the block ID currently being cropped, or null. */
  getCropBlockId(): number | null {
    return this.#cropBlockId;
  }

  /** Refresh the crop overlay after a rotation or flip change during crop mode. */
  refreshCropOverlay(): void {
    const blockId = this.#cropBlockId;
    if (blockId === null || !this.#cropTransform) return;

    const renderer = this.#ctx.renderer;
    if (!renderer) return;

    // Current overlay crop in OLD visual space
    const oldVisualCrop = renderer.getCropRect();
    if (!oldVisualCrop) return;

    const {
      rotation: oldRot,
      flipH: oldFlipH,
      flipV: oldFlipV,
      sourceWidth: imgW,
      sourceHeight: imgH,
    } = this.#cropTransform;

    const store = this.#ctx.engine.getBlockStore();

    // Convert old visual crop → source (pre-rotation) space using OLD transform
    const sourceCrop = visualCropToSource(oldVisualCrop, imgW, imgH, oldRot, oldFlipH, oldFlipV);

    // Read NEW rotation/flip from block store
    const newRot = store.getFloat(blockId, IMAGE_ROTATION);
    const newFlipH = store.getBool(blockId, CROP_FLIP_HORIZONTAL);
    const newFlipV = store.getBool(blockId, CROP_FLIP_VERTICAL);

    // Compute new visual bounds
    const { width: visualW, height: visualH } = getSizeAfterRotation(imgW, imgH, newRot);
    const newImageRect: CropRect = { x: 0, y: 0, width: visualW, height: visualH };

    // Convert source crop → new visual space
    const newVisualCrop = sourceCropToVisual(sourceCrop, imgW, imgH, newRot, newFlipH, newFlipV);

    // Update stored transform
    const newTransform = {
      rotation: newRot,
      flipH: newFlipH,
      flipV: newFlipV,
      sourceWidth: imgW,
      sourceHeight: imgH,
    };
    this.#cropTransform = newTransform;

    // Re-show overlay with new visual bounds and crop
    renderer.showCropOverlay(blockId, newImageRect, newVisualCrop, newTransform);

    // Fit camera to the new crop area
    renderer.fitToRect(newVisualCrop, 24);
  }

  resetCrop(blockId?: number): void {
    const id = blockId ?? this.#cropBlockId;
    if (id === null) return;
    resetCropBlock(this.#ctx.engine, this.#ctx.engine.getBlockStore(), id);
  }

  applyCropRatio(ratio: number | null): CropRect | null {
    const renderer = this.#ctx.renderer;
    return renderer ? applyCropRatioToOverlay(renderer, ratio) : null;
  }

  applyCropDimensions(width: number, height: number): CropRect | null {
    const renderer = this.#ctx.renderer;
    return renderer ? applyCropDimensionsToOverlay(renderer, width, height) : null;
  }

  getCropVisualDimensions(): { width: number; height: number } | null {
    const renderer = this.#ctx.renderer;
    return renderer ? getCropVisualDims(renderer) : null;
  }
}
