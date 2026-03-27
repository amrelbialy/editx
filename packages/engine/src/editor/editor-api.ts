import type { BlockAPI } from "../block/block-api";
import type { CursorType, EditMode, EditModeConfig } from "../editor-types";
import { EDIT_MODE_DEFAULTS } from "../editor-types";
import type { EngineCore } from "../engine-core";
import type { CropRect } from "../utils/crop-math";
import type { EditorContext } from "./editor-context";
import { EditorCrop } from "./editor-crop";
import { EditorCursor } from "./editor-cursor";
import { EditorHistory } from "./editor-history";
import { EditorViewport } from "./editor-viewport";

export class EditorAPI {
  #ctx: EditorContext;

  // â”€â”€ Sub-modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  #crop: EditorCrop;
  #cursor: EditorCursor;
  #history: EditorHistory;
  #viewport: EditorViewport;

  // â”€â”€ Edit-mode state (cross-cuts crop & cursor) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  #editMode: EditMode = "Transform";
  #editModeConfig: EditModeConfig = EDIT_MODE_DEFAULTS.Transform;

  constructor(engine: EngineCore) {
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

  /** @internal â€” called by EditxEngine after construction */
  _setBlockAPI(block: BlockAPI): void {
    this.#ctx.block = block;
  }

  setEditMode(mode: EditMode, opts?: { baseMode?: string; blockId?: number }): void {
    const prev = this.#editMode;

    // â”€â”€ Tear down previous mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (prev !== mode) {
      this.#exitMode(prev);
    }

    // â”€â”€ Apply new mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.#editMode = mode;

    const configKey = opts?.baseMode ?? mode;
    this.#editModeConfig = EDIT_MODE_DEFAULTS[configKey] ?? EDIT_MODE_DEFAULTS.Transform;

    // Reset cursor to mode default
    this.#cursor.setCursorType(this.#editModeConfig.defaultCursor);
    this.#cursor.setCursorRotation(0);

    // â”€â”€ Enter new mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.#enterMode(mode, opts?.blockId);

    this.#ctx.engine.emit("editMode:changed", { mode, previousMode: prev });
  }

  #enterMode(mode: EditMode, blockId?: number): void {
    if (mode === "Crop") {
      const targetId = blockId ?? (this.#ctx.block?.findAllSelected() ?? [])[0] ?? null;
      if (targetId === null) return;
      this.#crop.setupCropOverlay(targetId);
    }
  }

  #exitMode(mode: EditMode): void {
    if (mode === "Crop") {
      this.#crop.teardownCropOverlay();
    }
  }

  getEditMode(): EditMode {
    return this.#editMode;
  }

  getEditModeConfig(): Readonly<EditModeConfig> {
    return this.#editModeConfig;
  }

  setCursorType(type: CursorType): void {
    this.#cursor.setCursorType(type);
  }
  getCursorType(): CursorType {
    return this.#cursor.getCursorType();
  }
  setCursorRotation(degrees: number): void {
    this.#cursor.setCursorRotation(degrees);
  }
  getCursorRotation(): number {
    return this.#cursor.getCursorRotation();
  }

  setTextCursorPositionInScreenSpace(x: number, y: number): void {
    this.#cursor.setTextCursorPositionInScreenSpace(x, y);
  }
  getTextCursorPositionInScreenSpaceX(): number {
    return this.#cursor.getTextCursorPositionInScreenSpaceX();
  }
  getTextCursorPositionInScreenSpaceY(): number {
    return this.#cursor.getTextCursorPositionInScreenSpaceY();
  }

  undo(): void {
    this.#history.undo();
  }
  redo(): void {
    this.#history.redo();
  }
  canUndo(): boolean {
    return this.#history.canUndo();
  }
  canRedo(): boolean {
    return this.#history.canRedo();
  }
  clearHistory(): void {
    this.#history.clearHistory();
  }

  setZoom(zoom: number, animate = false): void {
    this.#viewport.setZoom(zoom, animate);
  }
  getZoom(): number {
    return this.#viewport.getZoom();
  }
  zoomIn(step = 0.1): void {
    this.#viewport.zoomIn(step);
  }
  zoomOut(step = 0.1): void {
    this.#viewport.zoomOut(step);
  }
  resetZoom(): void {
    this.#viewport.resetZoom();
  }

  panTo(x: number, y: number): void {
    this.#viewport.panTo(x, y);
  }
  panBy(dx: number, dy: number): void {
    this.#viewport.panBy(dx, dy);
  }
  getPan(): { x: number; y: number } {
    return this.#viewport.getPan();
  }

  fitToScreen(padding = 24, animate = false): void {
    this.#viewport.fitToScreen(padding, animate);
  }
  fitToSelection(padding = 24, animate = false): void {
    this.#viewport.fitToSelection(padding, animate);
  }

  screenToWorld(pt: { x: number; y: number }) {
    return this.#viewport.screenToWorld(pt);
  }
  worldToScreen(pt: { x: number; y: number }) {
    return this.#viewport.worldToScreen(pt);
  }

  getSelectedBlockScreenRect(): { x: number; y: number; width: number; height: number } | null {
    return this.#ctx.renderer?.getSelectedBlockScreenRect() ?? null;
  }

  getBlockScreenRect(
    blockId: number,
  ): { x: number; y: number; width: number; height: number } | null {
    return this.#ctx.renderer?.getBlockScreenRect(blockId) ?? null;
  }

  /** @internal */
  _getCrop(): EditorCrop {
    return this.#crop;
  }

  commitCrop(): CropRect | null {
    if (this.#crop.getCropBlockId() === null) return null;
    const rect = this.#ctx.renderer?.getCropRect() ?? null;
    this.setEditMode("Transform");
    return rect;
  }

  resetCrop(blockId?: number): void {
    this.#crop.resetCrop(blockId);
    this.fitToScreen();
  }

  getCropBlockId(): number | null {
    return this.#crop.getCropBlockId();
  }

  applyCropRatio(ratio: number | null): CropRect | null {
    return this.#crop.applyCropRatio(ratio);
  }

  refreshCropOverlay(): void {
    this.#crop.refreshCropOverlay();
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
    this.#ctx.renderer?.showCropOverlay(blockId, imageRect, initialCrop, transform);
  }

  hideCropOverlay(): void {
    this.#ctx.renderer?.hideCropOverlay();
  }

  setCropRect(rect: CropRect): void {
    this.#ctx.renderer?.setCropRect(rect);
  }

  getCropRect(): CropRect | null {
    return this.#ctx.renderer?.getCropRect() ?? null;
  }

  setCropRatio(ratio: number | null): void {
    this.#ctx.renderer?.setCropRatio(ratio);
  }
}
