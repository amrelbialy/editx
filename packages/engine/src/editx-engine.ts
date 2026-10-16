import { type ActivePageChangedEvent, ActivePageState } from "./active-page";
import { BlockAPI } from "./block/block-api";
import { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import { EditorAPI } from "./editor/editor-api";
import type { BlockExportOptions, ExportOptions } from "./editor-types";
import { exportBlock, exportScene } from "./editx-engine-export";
import { applyHistoryPatches, enqueueBlockEvents, flushDirtyBlocks } from "./editx-engine-flush";
import { type BlockTransformEvent, type EditModeChange, EngineCallbacks } from "./engine-callbacks";
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
  #navigation: ActivePageState;
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
    this.#navigation = new ActivePageState(this.#blockStore, (event) =>
      this.#callbacks.fireActivePage(event),
    );

    this.block = new BlockAPI(this);
    this.editor = new EditorAPI(this);
    this.editor._setBlockAPI(this.block);
    this.block._setApplyCropRatioHandler((r) => this.editor.applyCropRatio(r));
    this.block._setApplyCropDimensionsHandler((w, h) => this.editor.applyCropDimensions(w, h));
    this.block._setGetCropVisualDimensionsHandler(() => this.editor.getCropVisualDimensions());
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
    this.#navigation.setScene(id);
  }
  getActiveScene(): number | null {
    return this.#navigation.sceneId;
  }
  setActivePage(id: number) {
    this.#navigation.setPage(id);
  }
  getActivePage(): number | null {
    return this.#navigation.pageId;
  }
  /** @internal */
  _setActiveSceneAndPage(sceneId: number | null, pageId: number | null): void {
    this.#navigation.replace(sceneId, pageId);
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
      this.#navigation.reconcile();
      this.#flush();
    }
  }

  exec(command: Command) {
    const patches = command.do();
    if (patches && patches.length > 0) {
      for (const patch of patches) this.#dirty.add(patch.id);
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
    if (this.#batchDepth === 0) {
      this.#navigation.reconcile();
      this.#flush();
    }
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
    this.#navigation.reconcile();
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
    this.#callbacks.fireEvent(event, args[0]);
    if (event === "block:dblclick" && typeof args[0] === "number") {
      this.block._notifyBlockDoubleClick(args[0], args[1] as { x: number; y: number } | undefined);
    }
  }

  // ── Typed event subscriptions ──────────────────────────

  onActivePageChanged(cb: (event: ActivePageChangedEvent) => void) {
    return this.#callbacks.onActivePageChanged(cb);
  }
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
    return exportScene(this, options);
  }

  async exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob> {
    return exportBlock(this, blockId, options);
  }
}
