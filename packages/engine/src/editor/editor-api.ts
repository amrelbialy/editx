import { Engine } from '../engine';
import type { EditMode, CursorType, EditModeConfig } from '../editor-types';
import { EDIT_MODE_DEFAULTS } from '../editor-types';
import type { BlockAPI } from '../block/block-api';
import type { EditorContext } from './editor-context';
import { EditorCrop } from './editor-crop';
import { EditorCursor } from './editor-cursor';
import { EditorHistory } from './editor-history';
import { EditorViewport } from './editor-viewport';

/**
 * Public editor API — the single entry-point for UI-level operations
 * (mode management, cursor, viewport, history).
 *
 * Owns the shared {@link EditorContext} and delegates domain logic to
 * focused sub-modules following the same pattern as BlockStore.
 *
 * **Crop** is handled entirely through mode transitions:
 *   - `setEditMode('Crop')` — enters crop mode (overlay shown internally)
 *   - `setEditMode('Transform')` — exits crop mode (auto-commits)
 *   - Cancel = exit + `undo()`
 *   - Ratio/reset = `BlockAPI` methods
 */
export class EditorAPI {
  #ctx: EditorContext;

  // ── Sub-modules ────────────────────────────────────────
  #crop: EditorCrop;
  #cursor: EditorCursor;
  #history: EditorHistory;
  #viewport: EditorViewport;

  // ── Edit-mode state (cross-cuts crop & cursor) ─────────
  #editMode: EditMode = 'Transform';
  #editModeConfig: EditModeConfig = EDIT_MODE_DEFAULTS['Transform'];

  constructor(engine: Engine) {
    this.#ctx = {
      engine,
      renderer: engine.getRenderer(),
      block: null,
    };

    this.#crop = new EditorCrop(this.#ctx);
    this.#cursor = new EditorCursor(this.#ctx);
    this.#history = new EditorHistory(this.#ctx);
    this.#viewport = new EditorViewport(this.#ctx);
  }

  /** @internal — called by CreativeEngine after construction */
  _setBlockAPI(block: BlockAPI): void {
    this.#ctx.block = block;
  }

  // ─── Edit Mode Management ─────────────────────────────

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
    this.#cursor.setCursorType(this.#editModeConfig.defaultCursor);
    this.#cursor.setCursorRotation(0);

    console.log(`Entered edit mode: ${mode}`, this.#editModeConfig);
    // ── Enter new mode ───────────────────────────────
    this.#enterMode(mode, opts?.blockId);

    this.#ctx.engine.emit('editMode:changed', { mode, previousMode: prev });
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
      const targetId = blockId ?? (this.#ctx.block?.findAllSelected() ?? [])[0] ?? null;
      console.log('entering Crop mode with target block', targetId);
      if (targetId === null) return;
      this.#crop.setupCropOverlay(targetId);
    }
  }

  /**
   * Handle mode-specific teardown when leaving a mode.
   */
  #exitMode(mode: EditMode): void {
    if (mode === 'Crop') {
      this.#crop.teardownCropOverlay();
    }
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

  // ─── Cursor (delegated) ───────────────────────────────

  setCursorType(type: CursorType): void { this.#cursor.setCursorType(type); }
  getCursorType(): CursorType { return this.#cursor.getCursorType(); }
  setCursorRotation(degrees: number): void { this.#cursor.setCursorRotation(degrees); }
  getCursorRotation(): number { return this.#cursor.getCursorRotation(); }

  setTextCursorPositionInScreenSpace(x: number, y: number): void {
    this.#cursor.setTextCursorPositionInScreenSpace(x, y);
  }
  getTextCursorPositionInScreenSpaceX(): number {
    return this.#cursor.getTextCursorPositionInScreenSpaceX();
  }
  getTextCursorPositionInScreenSpaceY(): number {
    return this.#cursor.getTextCursorPositionInScreenSpaceY();
  }

  // ─── History (delegated) ──────────────────────────────

  undo(): void { this.#history.undo(); }
  redo(): void { this.#history.redo(); }
  canUndo(): boolean { return this.#history.canUndo(); }
  canRedo(): boolean { return this.#history.canRedo(); }
  clearHistory(): void { this.#history.clearHistory(); }

  // ─── Viewport / Camera (delegated) ────────────────────

  setZoom(zoom: number): void { this.#viewport.setZoom(zoom); }
  getZoom(): number { return this.#viewport.getZoom(); }
  zoomIn(step = 0.1): void { this.#viewport.zoomIn(step); }
  zoomOut(step = 0.1): void { this.#viewport.zoomOut(step); }
  resetZoom(): void { this.#viewport.resetZoom(); }

  panTo(x: number, y: number): void { this.#viewport.panTo(x, y); }
  panBy(dx: number, dy: number): void { this.#viewport.panBy(dx, dy); }
  getPan(): { x: number; y: number } { return this.#viewport.getPan(); }

  fitToScreen(padding = 24): void { this.#viewport.fitToScreen(padding); }

  screenToWorld(pt: { x: number; y: number }) { return this.#viewport.screenToWorld(pt); }
  worldToScreen(pt: { x: number; y: number }) { return this.#viewport.worldToScreen(pt); }

  // ─── Internal: crop sub-module access ──────────────────
  // Used by BlockAPI to route applyCropRatio through the active overlay.

  /** @internal */
  _getCrop(): EditorCrop { return this.#crop; }
}
