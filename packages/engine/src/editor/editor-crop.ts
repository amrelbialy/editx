import type { EditorContext } from './editor-context';
import type { CropRect } from '../utils/crop-math';
import { SetPropertyCommand } from '../controller/commands';
import {
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL,
  SIZE_WIDTH, SIZE_HEIGHT,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ROTATION,
} from '../block/property-keys';
import { normalizeRotation, getSizeAfterRotation, sourceCropToVisual, visualCropToSource } from '../utils/rotation-math';

/**
 * Internal crop module — manages the crop overlay lifecycle and auto-commit.
 *
 * This class is **not** exposed on the public EditorAPI. Consumers interact
 * with crop exclusively through:
 *   - `editor.setEditMode('Crop')` — enters crop mode (overlay shown)
 *   - `editor.setEditMode('Transform')` — exits crop mode (auto-commits)
 *   - `block.resetCrop(id)` — resets crop properties via BlockAPI
 *   - `block.applyCropRatio(id, ratio)` — applies ratio via BlockAPI (reacts internally)
 *
 * Exiting crop mode always commits the current overlay rect to block
 * properties as a single undo batch. Cancel is achieved by the consumer
 * calling `editor.undo()` immediately after exiting.
 */
export class EditorCrop {
  #ctx: EditorContext;

  /** Block currently being cropped (set when entering Crop mode). */
  #cropBlockId: number | null = null;

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

    const blockType = store.getType(blockId);

    // Source (pre-rotation) image dimensions
    const origW = store.getFloat(blockId, IMAGE_ORIGINAL_WIDTH);
    const origH = store.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT);

    let imgW: number;
    let imgH: number;

    if (origW > 0 && origH > 0) {
      imgW = origW;
      imgH = origH;
    } else if (blockType === 'page') {
      imgW = store.getFloat(blockId, PAGE_WIDTH);
      imgH = store.getFloat(blockId, PAGE_HEIGHT);
    } else {
      imgW = store.getFloat(blockId, SIZE_WIDTH);
      imgH = store.getFloat(blockId, SIZE_HEIGHT);
    }

    // Current rotation & flip
    const rotation = store.getFloat(blockId, IMAGE_ROTATION);
    const flipH = store.getBool(blockId, CROP_FLIP_HORIZONTAL);
    const flipV = store.getBool(blockId, CROP_FLIP_VERTICAL);

    // Compute visual (post-rotation) full-image bounds for the overlay.
    // For exact 90°/270°, swap W↔H. For arbitrary angles, compute the AABB.
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
        imgW, imgH, rotation, flipH, flipV,
      );
    }

    this.#ctx.renderer?.showCropOverlay(blockId, imageRect, initialCrop, {
      rotation, flipH, flipV, sourceWidth: imgW, sourceHeight: imgH,
    });

    // Fit the camera to the crop area (or the full image when no crop exists)
    const fitRect = initialCrop ?? imageRect;
    this.#ctx.renderer?.fitToRect(fitRect, 24);

    return initialCrop ?? imageRect;
  }

  /**
   * Tear down the crop overlay — auto-commits the current crop rect
   * to block properties before hiding the overlay.
   *
   * The commit is written as a single undo batch. If the consumer wants
   * to discard the crop, they call `editor.undo()` after exiting.
   */
  teardownCropOverlay(): void {
    // Auto-commit the current overlay rect
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
  }

  // ─── Internal Commit ──────────────────────────────────

  /**
   * Commit the current crop overlay rect to block properties.
   * Single undo batch. For page blocks, also resizes the page to match.
   */
  #commitCropToBlock(): CropRect | null {
    const id = this.#cropBlockId;
    if (id === null) return null;
    const visualRect = this.#ctx.renderer?.getCropRect() ?? null;
    if (!visualRect) return null;
    const store = this.#ctx.engine.getBlockStore();
    const engine = this.#ctx.engine;

    // Source image dimensions
    const origW = store.getFloat(id, IMAGE_ORIGINAL_WIDTH);
    const origH = store.getFloat(id, IMAGE_ORIGINAL_HEIGHT);
    const blockType = store.getType(id);
    let imgW: number, imgH: number;
    if (origW > 0 && origH > 0) {
      imgW = origW; imgH = origH;
    } else if (blockType === 'page') {
      imgW = store.getFloat(id, PAGE_WIDTH);
      imgH = store.getFloat(id, PAGE_HEIGHT);
    } else {
      imgW = store.getFloat(id, SIZE_WIDTH);
      imgH = store.getFloat(id, SIZE_HEIGHT);
    }

    // Transform visual crop rect back to source-image space for Konva .crop()
    const rotation = store.getFloat(id, IMAGE_ROTATION);
    const flipH = store.getBool(id, CROP_FLIP_HORIZONTAL);
    const flipV = store.getBool(id, CROP_FLIP_VERTICAL);
    const sourceRect = visualCropToSource(visualRect, imgW, imgH, rotation, flipH, flipV);

    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, CROP_X, sourceRect.x));
    engine.exec(new SetPropertyCommand(store, id, CROP_Y, sourceRect.y));
    engine.exec(new SetPropertyCommand(store, id, CROP_WIDTH, sourceRect.width));
    engine.exec(new SetPropertyCommand(store, id, CROP_HEIGHT, sourceRect.height));
    engine.exec(new SetPropertyCommand(store, id, CROP_ENABLED, true));
    // Page dimensions = visual crop dimensions (what the user sees)
    if (blockType === 'page') {
      engine.exec(new SetPropertyCommand(store, id, PAGE_WIDTH, visualRect.width));
      engine.exec(new SetPropertyCommand(store, id, PAGE_HEIGHT, visualRect.height));
    }
    engine.endBatch();

    return visualRect;
  }

  /** Get the block ID currently being cropped, or null. */
  getCropBlockId(): number | null {
    return this.#cropBlockId;
  }

  /**
   * Reset the crop for the given block (or the currently-cropped block).
   * Restores page dimensions to the original image size, clears all crop
   * properties. Single undo batch.
   *
   * Does NOT call fitToScreen — the caller (EditorAPI) handles that.
   */
  resetCrop(blockId?: number): void {
    const id = blockId ?? this.#cropBlockId;
    if (id === null) return;

    const store = this.#ctx.engine.getBlockStore();
    const engine = this.#ctx.engine;
    const origW = store.getFloat(id, IMAGE_ORIGINAL_WIDTH);
    const origH = store.getFloat(id, IMAGE_ORIGINAL_HEIGHT);
    if (origW <= 0 || origH <= 0) return;

    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, CROP_X, 0));
    engine.exec(new SetPropertyCommand(store, id, CROP_Y, 0));
    engine.exec(new SetPropertyCommand(store, id, CROP_WIDTH, 0));
    engine.exec(new SetPropertyCommand(store, id, CROP_HEIGHT, 0));
    engine.exec(new SetPropertyCommand(store, id, CROP_ENABLED, false));
    // Restore page dimensions accounting for current rotation
    const blockType = store.getType(id);
    if (blockType === 'page') {
      const rotation = store.getFloat(id, IMAGE_ROTATION);
      const isSwap = Math.abs(Math.round(normalizeRotation(rotation) / 90)) % 2 === 1;
      engine.exec(new SetPropertyCommand(store, id, PAGE_WIDTH, isSwap ? origH : origW));
      engine.exec(new SetPropertyCommand(store, id, PAGE_HEIGHT, isSwap ? origW : origH));
    }
    engine.endBatch();
  }

  /**
   * Apply an aspect ratio to the current crop overlay.
   *
   * Called internally by BlockAPI.applyCropRatio() via the engine event bus.
   * Computes the largest rect with the given ratio that fits within the image
   * bounds, centered on the current crop center, and updates the overlay.
   */
  applyCropRatio(ratio: number | null): CropRect | null {
    const renderer = this.#ctx.renderer;
    if (!renderer) return null;

    const imageRect = renderer.getCropImageRect();
    if (!imageRect) return null;

    // Set ratio on the overlay (controls keepRatio + enabled anchors)
    renderer.setCropRatio(ratio);

    // Free mode: no rect change needed
    if (ratio === null) return renderer.getCropRect();

    const currentCrop = renderer.getCropRect();
    if (!currentCrop) return null;

    // Compute the largest rect with this ratio that fits within the image
    let newWidth: number;
    let newHeight: number;

    if (imageRect.width / imageRect.height > ratio) {
      newHeight = imageRect.height;
      newWidth = newHeight * ratio;
    } else {
      newWidth = imageRect.width;
      newHeight = newWidth / ratio;
    }

    // Center the new crop rect on the current crop's center
    const currentCenterX = currentCrop.x + currentCrop.width / 2;
    const currentCenterY = currentCrop.y + currentCrop.height / 2;

    let newX = currentCenterX - newWidth / 2;
    let newY = currentCenterY - newHeight / 2;

    // Clamp to image bounds
    if (newX < imageRect.x) newX = imageRect.x;
    if (newY < imageRect.y) newY = imageRect.y;
    if (newX + newWidth > imageRect.x + imageRect.width) {
      newX = imageRect.x + imageRect.width - newWidth;
    }
    if (newY + newHeight > imageRect.y + imageRect.height) {
      newY = imageRect.y + imageRect.height - newHeight;
    }

    const newCrop: CropRect = { x: newX, y: newY, width: newWidth, height: newHeight };
    renderer.setCropRect(newCrop);

    // Re-fit the camera to the crop area so it fills the viewport (img.ly-style).
    renderer.fitToRect(newCrop, 24);

    return newCrop;
  }

  /**
   * Apply exact pixel dimensions to the current crop overlay.
   *
   * Computes the largest crop rect with those exact dimensions that fits
   * within the image, centered on the current crop center.  If the requested
   * dimensions exceed the image bounds they are clamped while preserving
   * the requested aspect ratio.
   */
  applyCropDimensions(width: number, height: number): CropRect | null {
    const renderer = this.#ctx.renderer;
    if (!renderer) return null;

    const imageRect = renderer.getCropImageRect();
    if (!imageRect) return null;

    // Clamp to image bounds while preserving the requested ratio
    let w = Math.max(1, Math.round(width));
    let h = Math.max(1, Math.round(height));

    if (w > imageRect.width || h > imageRect.height) {
      const ratio = w / h;
      if (imageRect.width / imageRect.height > ratio) {
        // Image is wider than requested ratio → height-limited
        h = Math.round(Math.min(h, imageRect.height));
        w = Math.round(h * ratio);
      } else {
        // Image is taller than requested ratio → width-limited
        w = Math.round(Math.min(w, imageRect.width));
        h = Math.round(w / ratio);
      }
    }

    // Lock overlay ratio to the requested dimensions
    renderer.setCropRatio(w / h);

    const currentCrop = renderer.getCropRect();
    if (!currentCrop) return null;

    // Center on current crop center
    const cx = currentCrop.x + currentCrop.width / 2;
    const cy = currentCrop.y + currentCrop.height / 2;
    let newX = cx - w / 2;
    let newY = cy - h / 2;

    // Clamp to image bounds
    if (newX < imageRect.x) newX = imageRect.x;
    if (newY < imageRect.y) newY = imageRect.y;
    if (newX + w > imageRect.x + imageRect.width) {
      newX = imageRect.x + imageRect.width - w;
    }
    if (newY + h > imageRect.y + imageRect.height) {
      newY = imageRect.y + imageRect.height - h;
    }

    const newCrop: CropRect = { x: newX, y: newY, width: w, height: h };
    renderer.setCropRect(newCrop);
    renderer.fitToRect(newCrop, 24);
    return newCrop;
  }

  /**
   * Returns the current crop overlay dimensions in visual (post-rotation)
   * pixels, rounded to integers.  Returns null when no overlay is active.
   */
  getCropVisualDimensions(): { width: number; height: number } | null {
    const renderer = this.#ctx.renderer;
    if (!renderer) return null;
    const rect = renderer.getCropRect();
    if (!rect) return null;
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  }
}
