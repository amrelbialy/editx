import { Engine } from './engine';
import { RendererAdapter } from './render-adapter';
import { type CropRect } from './utils/crop-math';
import type { EditMode, CursorType, EditModeConfig } from './editor-types';
import { EDIT_MODE_DEFAULTS } from './editor-types';
import {
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL,
  SIZE_WIDTH, SIZE_HEIGHT,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ROTATION,
} from './block/property-keys';
import { normalizeRotation, getSizeAfterRotation, sourceCropToVisual, visualCropToSource } from './utils/rotation-math';
import { SetPropertyCommand } from './controller/commands';
import type { BlockAPI } from './block/block-api';

export class EditorAPI {
  #engine: Engine;
  #renderer: RendererAdapter | null;
  #block: BlockAPI | null = null;

  // ── Edit-mode & cursor state (owned by EditorAPI, not Engine) ──
  #editMode: EditMode = 'Transform';
  #editModeConfig: EditModeConfig = EDIT_MODE_DEFAULTS['Transform'];
  #cursorType: CursorType = 'default';
  #cursorRotation = 0;
  #textCursorScreenX = 0;
  #textCursorScreenY = 0;

  /** Block currently being cropped (set when entering Crop mode). */
  #cropBlockId: number | null = null;

  constructor(engine: Engine) {
    this.#engine = engine;
    this.#renderer = engine.getRenderer();
  }

  /** @internal — called by CreativeEngine after construction */
  _setBlockAPI(block: BlockAPI): void {
    this.#block = block;
  }

  // ─── Edit Mode Management ─────────────────────────────────────

  /**
   * Set the editor's current edit mode.
   *
   * This is the single entry point for mode transitions. When switching
   * into a tool mode (e.g. "Crop"), the editor automatically sets up the
   * required state (overlay, cursor, selection behaviour) using the
   * current selection. When leaving a tool mode, the editor tears it down.
   *
   * @param mode — "Transform", "Crop", "Text", "Playback", "Trim", or a custom value.
   * @param opts — Optional settings for mode entry.
   * @param opts.baseMode — Base mode from which a custom mode inherits config.
   * @param opts.blockId — Explicit block to target (e.g. for Crop mode).
   *   When omitted, the current selection is used.
   *
   * @example
   *   engine.editor.setEditMode('Crop');               // crops the selected block
   *   engine.editor.setEditMode('Crop', { blockId: 5 }); // crops block 5 directly
   *   engine.editor.setEditMode('Transform');           // back to default
   *   engine.editor.setEditMode('CustomMode', { baseMode: 'Crop' });
   */
  setEditMode(
    mode: EditMode,
    opts?: { baseMode?: string; blockId?: number },
  ): void {
    const prev = this.#editMode;

    // ── Tear down previous mode ──────────────────────
    if (prev !== mode) {
      this.#exitMode(prev);
    }

    // ── Apply new mode ───────────────────────────────
    this.#editMode = mode;

    const configKey = opts?.baseMode ?? mode;
    this.#editModeConfig = EDIT_MODE_DEFAULTS[configKey] ?? EDIT_MODE_DEFAULTS['Transform'];

    // Reset cursor to mode default
    this.#cursorType = this.#editModeConfig.defaultCursor;
    this.#cursorRotation = 0;
    this.#renderer?.setCursor?.(this.#cursorType);

    // ── Enter new mode ───────────────────────────────
    this.#enterMode(mode, opts?.blockId);

    this.#engine.emit('editMode:changed', { mode, previousMode: prev });
  }

  /**
   * Handle mode-specific setup when entering a mode.
   *
   * When an explicit `blockId` is provided (e.g. image-editor passing the
   * base image block), it is used directly. Otherwise the current selection
   * is used — the standard multi-block editor workflow.
   */
  #enterMode(mode: EditMode, blockId?: number): void {
    if (mode === 'Crop') {
      const targetId = blockId ?? (this.#block?.findAllSelected() ?? [])[0] ?? null;
      if (targetId === null) return;
      this.#setupCropOverlay(targetId);
    }
  }

  /**
   * Handle mode-specific teardown when leaving a mode.
   *
   * When leaving Crop mode, the current overlay rect is auto-committed
   * to block properties as a single undo batch. If the consumer wants
   * to discard the crop, they call `editor.undo()` after exiting.
   */
  #exitMode(mode: EditMode): void {
    if (mode === 'Crop') {
      // Auto-commit the current overlay rect to block properties
      this.#commitCropToBlock();

      const blockId = this.#cropBlockId;
      this.#renderer?.hideCropOverlay();
      // Re-sync the block to restore the Konva node from any temporary
      // visual changes made during crop mode (e.g. page expansion).
      if (blockId !== null) {
        const store = this.#engine.getBlockStore();
        const block = store.get(blockId);
        if (block) {
          this.#renderer?.syncBlock(blockId, block);
        }
      }
      this.#cropBlockId = null;
    }
  }

  /**
   * Set up the crop overlay for the given block.
   *
   * Uses the original image dimensions (IMAGE_ORIGINAL_WIDTH/HEIGHT) as the
   * full image rect so that re-entering crop mode after a previous crop allows
   * the user to expand/adjust freely within the original bounds.
   * Falls back to PAGE_WIDTH/HEIGHT (or SIZE_WIDTH/HEIGHT) if originals are not set.
   */
  #setupCropOverlay(blockId: number): CropRect | null {
    const store = this.#engine.getBlockStore();
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

    this.#renderer?.showCropOverlay(blockId, imageRect, initialCrop, { rotation, flipH, flipV, sourceWidth: imgW, sourceHeight: imgH });

    // Fit the camera to the crop area (or the full image when no crop exists)
    // so the viewport shows the relevant region (img.ly-style).
    const fitRect = initialCrop ?? imageRect;
    this.#renderer?.fitToRect(fitRect, 24);

    return initialCrop ?? imageRect;
  }

  /**
   * Get the editor's current edit mode.
   *
   * @returns "Transform", "Crop", "Text", "Playback", "Trim", or a custom value.
   */
  getEditMode(): EditMode {
    return this.#editMode;
  }

  /**
   * Get the configuration for the current edit mode.
   */
  getEditModeConfig(): Readonly<EditModeConfig> {
    return this.#editModeConfig;
  }

  // ─── Cursor ───────────────────────────────────────────────────

  /**
   * Set the cursor type that should be displayed.
   */
  setCursorType(type: CursorType): void {
    this.#cursorType = type;
    this.#renderer?.setCursor?.(type);
  }

  /**
   * Get the cursor type that should be displayed.
   */
  getCursorType(): CursorType {
    return this.#cursorType;
  }

  /**
   * Set the cursor rotation angle (in degrees).
   */
  setCursorRotation(degrees: number): void {
    this.#cursorRotation = degrees;
  }

  /**
   * Get the cursor rotation angle (in degrees).
   */
  getCursorRotation(): number {
    return this.#cursorRotation;
  }

  /**
   * Set the text cursor's position in screen space.
   */
  setTextCursorPositionInScreenSpace(x: number, y: number): void {
    this.#textCursorScreenX = x;
    this.#textCursorScreenY = y;
  }

  /**
   * Get the text cursor's x position in screen space.
   */
  getTextCursorPositionInScreenSpaceX(): number {
    return this.#textCursorScreenX;
  }

  /**
   * Get the text cursor's y position in screen space.
   */
  getTextCursorPositionInScreenSpaceY(): number {
    return this.#textCursorScreenY;
  }

  // ─── History ──────────────────────────────────────────────────

  undo() {
    this.#engine.undo();
  }

  redo() {
    this.#engine.redo();
  }

  canUndo() {
    return this.#engine.canUndo();
  }

  canRedo() {
    return this.#engine.canRedo();
  }

  clearHistory() {
    this.#engine.clearHistory();
  }

  // --- Viewport / Camera ---

  setZoom(zoom: number) {
    this.#renderer?.setZoom(zoom);
  }

  getZoom(): number {
    return this.#renderer?.getZoom() ?? 1;
  }

  zoomIn(step = 0.1) {
    this.setZoom(this.getZoom() + step);
  }

  zoomOut(step = 0.1) {
    this.setZoom(Math.max(0.1, this.getZoom() - step));
  }

  resetZoom() {
    this.setZoom(1);
  }

  panTo(x: number, y: number) {
    this.#renderer?.panTo(x, y);
  }

  panBy(dx: number, dy: number) {
    const { x, y } = this.#renderer?.getPan() ?? { x: 0, y: 0 };
    this.#renderer?.panTo(x + dx, y + dy);
  }

  getPan(): { x: number; y: number } {
    return this.#renderer?.getPan() ?? { x: 0, y: 0 };
  }

  // --- Fitting / Centering ---

  fitToScreen(padding = 24) {
    const store = this.#engine.getBlockStore();
    // Use the active page dimensions for fitting — this ensures the camera
    // reflects the actual content size, especially after crop commits that
    // resize the page.
    const pageId = this.#engine.getActivePage();
    if (pageId === null) return;

    const pageBlock = store.get(pageId);
    if (!pageBlock) return;

    this.#renderer?.fitToScreen({
      width: (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080,
      height: (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080,
      padding,
    });
  }

  // --- Coordinate Transforms ---

  screenToWorld(pt: { x: number; y: number }) {
    return this.#renderer?.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }) {
    return this.#renderer?.worldToScreen(pt);
  }

  // --- Crop ---

  /**
   * Commit the current crop overlay rect to block properties.
   * Single undo batch. For page blocks, also resizes the page to match.
   * Returns the committed crop rect, or null if no crop was active.
   */
  #commitCropToBlock(): CropRect | null {
    const id = this.#cropBlockId;
    if (id === null) return null;
    const visualRect = this.#renderer?.getCropRect() ?? null;
    if (!visualRect) return null;
    const store = this.#engine.getBlockStore();

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

    this.#engine.beginBatch();
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_X, sourceRect.x));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_Y, sourceRect.y));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_WIDTH, sourceRect.width));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_HEIGHT, sourceRect.height));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_ENABLED, true));
    // Page dimensions = visual crop dimensions (what the user sees)
    if (blockType === 'page') {
      this.#engine.exec(new SetPropertyCommand(store, id, PAGE_WIDTH, visualRect.width));
      this.#engine.exec(new SetPropertyCommand(store, id, PAGE_HEIGHT, visualRect.height));
    }
    this.#engine.endBatch();
    return visualRect;
  }

  /**
   * Commit the current crop to the block's properties and exit crop mode.
   *
   * This is a convenience wrapper: `setEditMode('Transform')` already
   * auto-commits via `#exitMode`, so calling this is equivalent but
   * also returns the committed rect.
   */
  commitCrop(): CropRect | null {
    const id = this.#cropBlockId;
    if (id === null) return null;
    const rect = this.#renderer?.getCropRect() ?? null;
    // Transition to Transform mode — #exitMode auto-commits
    this.setEditMode('Transform');
    return rect;
  }

  /**
   * Reset the crop for the given block (or the currently-cropped block).
   * Restores page dimensions to the original image size, clears all crop
   * properties, and re-fits the camera. Single undo batch.
   */
  resetCrop(blockId?: number): void {
    const id = blockId ?? this.#cropBlockId;
    if (id === null) return;

    const store = this.#engine.getBlockStore();
    const origW = store.getFloat(id, IMAGE_ORIGINAL_WIDTH);
    const origH = store.getFloat(id, IMAGE_ORIGINAL_HEIGHT);
    if (origW <= 0 || origH <= 0) return;

    this.#engine.beginBatch();
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_X, 0));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_Y, 0));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_WIDTH, 0));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_HEIGHT, 0));
    this.#engine.exec(new SetPropertyCommand(store, id, CROP_ENABLED, false));
    // Restore page dimensions accounting for current rotation
    const blockType = store.getType(id);
    if (blockType === 'page') {
      const rotation = store.getFloat(id, IMAGE_ROTATION);
      const isSwap = Math.abs(Math.round(normalizeRotation(rotation) / 90)) % 2 === 1;
      this.#engine.exec(new SetPropertyCommand(store, id, PAGE_WIDTH, isSwap ? origH : origW));
      this.#engine.exec(new SetPropertyCommand(store, id, PAGE_HEIGHT, isSwap ? origW : origH));
    }
    this.#engine.endBatch();

    this.fitToScreen();
  }

  /** Get the block ID currently being cropped, or null. */
  getCropBlockId(): number | null {
    return this.#cropBlockId;
  }

  // --- Crop overlay (low-level) ---

  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: { rotation: number; flipH: boolean; flipV: boolean; sourceWidth: number; sourceHeight: number },
  ) {
    this.#renderer?.showCropOverlay(blockId, imageRect, initialCrop, transform);
  }

  hideCropOverlay() {
    this.#renderer?.hideCropOverlay();
  }

  setCropRect(rect: CropRect) {
    this.#renderer?.setCropRect(rect);
  }

  /** Get the current crop rect from the active crop overlay, or null if not active. */
  getCropRect(): CropRect | null {
    return this.#renderer?.getCropRect() ?? null;
  }

  setCropRatio(ratio: number | null) {
    this.#renderer?.setCropRatio(ratio);
  }

  /**
   * Apply an aspect ratio to the current crop overlay.
   * Computes the largest rect with the given ratio that fits within the image bounds,
   * centered on the current crop center, and updates the overlay.
   * Returns the new crop rect, or null if the crop overlay is not active.
   */
  applyCropRatio(ratio: number | null): CropRect | null {
    const renderer = this.#renderer;
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
