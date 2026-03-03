import type { EditorContext } from './editor-context';
import type { CropRect } from '../utils/crop-math';
import { SetPropertyCommand } from '../controller/commands';
import {
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  SIZE_WIDTH, SIZE_HEIGHT,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT,
} from '../block/property-keys';

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
    console.log('setting up crop overlay for block', blockId, block);
    if (!block) return null;

    this.#cropBlockId = blockId;

    const blockType = store.getType(blockId);

    // Use original image dimensions if available (set on image load).
    // This ensures re-entering crop after a commit shows the full original image.
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

    const imageRect: CropRect = { x: 0, y: 0, width: imgW, height: imgH };
    console.log('determined image rect for crop overlay', imageRect);
    const cropEnabled = store.getBool(blockId, CROP_ENABLED);
    const cropX = store.getFloat(blockId, CROP_X);
    const cropY = store.getFloat(blockId, CROP_Y);
    const cropW = store.getFloat(blockId, CROP_WIDTH);
    const cropH = store.getFloat(blockId, CROP_HEIGHT);

    const initialCrop = cropEnabled && cropW > 0 && cropH > 0
      ? { x: cropX, y: cropY, width: cropW, height: cropH }
      : undefined;

    console.log('block crop properties', { blockId, cropEnabled, cropX, cropY, cropW, cropH });
    this.#ctx.renderer?.showCropOverlay(blockId, imageRect, initialCrop);

    // Fit the camera to the crop area (or the full image when no crop exists)
    // so the viewport shows the relevant region (img.ly-style).
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
    const rect = this.#ctx.renderer?.getCropRect() ?? null;
    if (!rect) return null;
    console.log('auto-committing crop for block', id, rect);
    const store = this.#ctx.engine.getBlockStore();
    const engine = this.#ctx.engine;
    engine.beginBatch();
    engine.exec(new SetPropertyCommand(store, id, CROP_X, rect.x));
    engine.exec(new SetPropertyCommand(store, id, CROP_Y, rect.y));
    engine.exec(new SetPropertyCommand(store, id, CROP_WIDTH, rect.width));
    engine.exec(new SetPropertyCommand(store, id, CROP_HEIGHT, rect.height));
    engine.exec(new SetPropertyCommand(store, id, CROP_ENABLED, true));
    // Resize page to match the crop dimensions (img.ly-style crop)
    const blockType = store.getType(id);
    if (blockType === 'page') {
      engine.exec(new SetPropertyCommand(store, id, PAGE_WIDTH, rect.width));
      engine.exec(new SetPropertyCommand(store, id, PAGE_HEIGHT, rect.height));
    }
    engine.endBatch();

    return rect;
  }

  /** Get the block ID currently being cropped, or null. */
  getCropBlockId(): number | null {
    return this.#cropBlockId;
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
}
