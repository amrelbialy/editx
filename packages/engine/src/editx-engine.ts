import { BlockAPI } from "./block/block-api";
import { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import { EditorAPI } from "./editor/editor-api";
import type { BlockExportOptions, ExportOptions } from "./editor-types";
import { applyHistoryPatches, enqueueBlockEvents, flushDirtyBlocks } from "./editx-engine-flush";
import {
  type BlockTransformEvent,
  type EditModeChange,
  EngineCallbacks,
  isBlockTransform,
  isEditModeChange,
  isPoint,
} from "./engine-callbacks";
import type { EngineCore } from "./engine-core";
import { EventAPI } from "./event-api";
import { EventBus } from "./events/event-bus";
import { HistoryManager, type Patch } from "./history-manager";
import type { RendererAdapter } from "./render-adapter";
import { SceneAPI } from "./scene";
import { clearImageCache } from "./utils/image-loader";

export class EditxEngine implements EngineCore {
  readonly block: BlockAPI;
  readonly editor: EditorAPI;
  readonly event: EventAPI;
  readonly scene: SceneAPI;

  #blockStore: BlockStore;
  #events = new EventBus();
  #history = new HistoryManager();
  #renderer: RendererAdapter | null;
  #dirty = new Set<number>();
  #activeSceneId: number | null = null;
  #activePageId: number | null = null;
  #batchDepth = 0;
  #batchPatches: Patch[] = [];
  #silentDepth = 0;
  #disposed = false;

  // Typed public callback registrations (history / zoom / pan / edit-mode / live transform)
  #callbacks = new EngineCallbacks();

  constructor(opts?: { renderer?: RendererAdapter; blockStore?: BlockStore }) {
    this.#blockStore = opts?.blockStore ?? new BlockStore();
    this.#renderer = opts?.renderer ?? null;
    this.event = new EventAPI();

    this.block = new BlockAPI(this);
    this.editor = new EditorAPI(this);
    this.editor._setBlockAPI(this.block);
    this.block._setApplyCropRatioHandler((r) => this.editor._getCrop().applyCropRatio(r));
    this.block._setApplyCropDimensionsHandler((w, h) =>
      this.editor._getCrop().applyCropDimensions(w, h),
    );
    this.block._setGetCropVisualDimensionsHandler(() =>
      this.editor._getCrop().getCropVisualDimensions(),
    );
    this.scene = new SceneAPI(this, this.block);
  }

  /** @internal — direct BlockStore access for sub-APIs; not part of the public surface. */
  _getBlockStore(): BlockStore {
    return this.#blockStore;
  }
  getRenderer(): RendererAdapter | null {
    return this.#renderer;
  }

  setAccentColor(color: string): void {
    this.#renderer?.setAccentColor?.(color);
  }

  setActiveScene(id: number) {
    this.#activeSceneId = id;
  }
  getActiveScene(): number | null {
    return this.#activeSceneId;
  }
  setActivePage(id: number) {
    this.#activePageId = id;
  }
  getActivePage(): number | null {
    return this.#activePageId;
  }

  /**
   * Suppresses history recording for mutations executed while active. Depth-counted so
   * re-entrant callers (e.g. a command whose flush triggers another silent-wrapped write)
   * compose correctly instead of the inner scope prematurely re-enabling history.
   */
  beginSilent() {
    this.#silentDepth++;
  }
  endSilent() {
    if (this.#silentDepth > 0) this.#silentDepth--;
  }

  beginBatch() {
    if (this.#batchDepth === 0) this.#batchPatches = [];
    this.#batchDepth++;
  }

  endBatch() {
    if (this.#batchDepth <= 0) return;
    this.#batchDepth--;
    if (this.#batchDepth === 0) {
      if (this.#batchPatches.length > 0) {
        if (this.#silentDepth === 0) {
          this.#history.push(this.#batchPatches);
          this.#callbacks.fireHistory();
        }
        this.#enqueueBlockEvents(this.#batchPatches);
      }
      this.#batchPatches = [];
      this.#flush();
    }
  }

  exec(command: Command) {
    const patches = command.do();
    if (patches && patches.length > 0) {
      this.#markDirty(patches);
      if (this.#batchDepth > 0) {
        this.#batchPatches.push(...patches);
      } else {
        if (this.#silentDepth === 0) {
          this.#history.push(patches);
          this.#callbacks.fireHistory();
        }
        this.#enqueueBlockEvents(patches);
      }
    }
    if (this.#batchDepth === 0) this.#flush();
  }

  #markDirty(patches: Patch[]) {
    for (const p of patches) this.#dirty.add(p.id);
  }

  #enqueueBlockEvents(patches: Patch[]) {
    enqueueBlockEvents(patches, this.event);
  }

  undo() {
    const patches = this.#history.undo();
    if (!patches) return;
    this.#applyPatches(patches);
    this.#cleanupSelections(patches);
    this.#events.emit("history:undo");
    this.#callbacks.fireHistory();
    this.#flush();
  }

  redo() {
    const patches = this.#history.redo();
    if (!patches) return;
    this.#applyPatches(patches);
    this.#cleanupSelections(patches);
    this.#events.emit("history:redo");
    this.#callbacks.fireHistory();
    this.#flush();
  }

  #cleanupSelections(patches: Patch[]) {
    const destroyed = patches.filter((p) => p.after === null).map((p) => p.id);
    if (destroyed.length > 0) this.block._removeFromSelection(destroyed);
  }

  canUndo() {
    return this.#history.canUndo();
  }
  canRedo() {
    return this.#history.canRedo();
  }

  clearHistory() {
    this.#history.clear();
    this.#events.emit("history:clear");
    this.#callbacks.fireHistory();
  }

  /** Render all dirty blocks now. */
  renderDirty() {
    this.#flush();
  }

  #applyPatches(patches: Patch[]) {
    applyHistoryPatches(patches, this.#blockStore, this.#dirty, this.event);
  }

  #flush() {
    if (!this.#renderer) return;
    flushDirtyBlocks(this.#dirty, this.#blockStore, this.#renderer, this.event);
  }

  on(event: string, cb: (...args: unknown[]) => void) {
    this.#events.on(event, cb);
  }
  off(event: string, cb: (...args: unknown[]) => void) {
    this.#events.off(event, cb);
  }
  emit(event: string, ...args: unknown[]) {
    this.#events.emit(event, ...args);
    if (event === "zoom:changed" && typeof args[0] === "number") {
      this.#callbacks.fireZoom(args[0]);
    } else if (event === "pan:changed" && isPoint(args[0])) {
      this.#callbacks.firePan(args[0]);
    } else if (event === "editMode:changed" && isEditModeChange(args[0])) {
      this.#callbacks.fireEditMode(args[0]);
    } else if (event === "block:transform" && isBlockTransform(args[0])) {
      this.#callbacks.fireBlockTransform(args[0]);
    } else if (event === "block:dblclick" && typeof args[0] === "number") {
      this.block._notifyBlockDoubleClick(args[0], args[1] as { x: number; y: number } | undefined);
    }
  }

  // ── Typed event subscriptions ──────────────────────────

  onHistoryChanged(cb: () => void) {
    return this.#callbacks.onHistoryChanged(cb);
  }
  onZoomChanged(cb: (zoom: number) => void) {
    return this.#callbacks.onZoomChanged(cb);
  }
  onPanChanged(cb: (pan: { x: number; y: number }) => void) {
    return this.#callbacks.onPanChanged(cb);
  }
  onEditModeChanged(cb: (info: EditModeChange) => void) {
    return this.#callbacks.onEditModeChanged(cb);
  }
  onBlockTransform(cb: (event: BlockTransformEvent) => void) {
    return this.#callbacks.onBlockTransform(cb);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#renderer?.dispose();
    clearImageCache();
  }

  async exportScene(options?: ExportOptions): Promise<Blob> {
    if (!this.#renderer) throw new Error("Cannot export: no renderer attached");
    return this.#renderer.exportScene({
      format: options?.format ?? "png",
      quality: options?.quality ?? 0.92,
      pixelRatio: options?.pixelRatio ?? 1,
    });
  }

  async exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob> {
    if (!this.#renderer) throw new Error("Cannot export: no renderer attached");
    const block = this.#blockStore.get(blockId);
    if (!block) throw new Error(`Cannot export: block ${blockId} does not exist`);
    if (!["graphic", "text", "image", "group"].includes(block.type)) {
      throw new Error(`Cannot export unsupported block type: ${block.type}`);
    }
    validateBlockExportOptions(options);
    this.#flush();
    return this.#renderer.exportBlock(blockId, {
      ...options,
      padding: options.padding ?? 0,
      pixelRatio: options.pixelRatio ?? 1,
    });
  }
}

function validateBlockExportOptions(options: BlockExportOptions): void {
  if (!Number.isInteger(options.width) || options.width <= 0) {
    throw new RangeError("Block export width must be a positive integer");
  }
  if (!Number.isInteger(options.height) || options.height <= 0) {
    throw new RangeError("Block export height must be a positive integer");
  }
  const padding = options.padding ?? 0;
  if (
    !Number.isFinite(padding) ||
    padding < 0 ||
    padding * 2 >= Math.min(options.width, options.height)
  ) {
    throw new RangeError("Block export padding must leave a positive inner rectangle");
  }
  const pixelRatio = options.pixelRatio ?? 1;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("Block export pixelRatio must be positive");
  }
}
