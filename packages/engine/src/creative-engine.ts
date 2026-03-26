import { BlockAPI } from "./block/block-api";
import { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import { applyHistoryPatches, enqueueBlockEvents, flushDirtyBlocks } from "./creative-engine-flush";
import { EditorAPI } from "./editor/editor-api";
import type { ExportOptions } from "./editor-types";
import type { EngineCore } from "./engine-core";
import { EventAPI } from "./event-api";
import { EventBus } from "./events/event-bus";
import { HistoryManager, type Patch } from "./history-manager";
import type { RendererAdapter } from "./render-adapter";
import { SceneAPI } from "./scene";
import { clearImageCache } from "./utils/image-loader";

export class CreativeEngine implements EngineCore {
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
  #silent = false;
  #disposed = false;

  // ── Typed listener sets for public callbacks
  #historyListeners = new Set<() => void>();
  #zoomListeners = new Set<(zoom: number) => void>();
  #editModeListeners = new Set<(info: { mode: string; previousMode: string }) => void>();

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

  getBlockStore(): BlockStore {
    return this.#blockStore;
  }
  getRenderer(): RendererAdapter | null {
    return this.#renderer;
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

  beginSilent() {
    this.#silent = true;
  }
  endSilent() {
    this.#silent = false;
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
        if (!this.#silent) {
          this.#history.push(this.#batchPatches);
          for (const cb of this.#historyListeners) cb();
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
        if (!this.#silent) {
          this.#history.push(patches);
          for (const cb of this.#historyListeners) cb();
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
    for (const cb of this.#historyListeners) cb();
    this.#flush();
  }

  redo() {
    const patches = this.#history.redo();
    if (!patches) return;
    this.#applyPatches(patches);
    this.#cleanupSelections(patches);
    this.#events.emit("history:redo");
    for (const cb of this.#historyListeners) cb();
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
    for (const cb of this.#historyListeners) cb();
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
      for (const cb of this.#zoomListeners) cb(args[0]);
    }
    if (
      event === "editMode:changed" &&
      args[0] &&
      typeof args[0] === "object" &&
      "mode" in args[0] &&
      "previousMode" in args[0]
    ) {
      for (const cb of this.#editModeListeners)
        cb(args[0] as { mode: string; previousMode: string });
    }
    if (event === "block:dblclick" && typeof args[0] === "number") {
      this.block._notifyBlockDoubleClick(args[0]);
    }
  }

  // ── Typed event subscriptions ──────────────────────────

  #subscribe<T extends (...args: any[]) => void>(set: Set<T>, cb: T): () => void {
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }

  onHistoryChanged(cb: () => void) {
    return this.#subscribe(this.#historyListeners, cb);
  }
  onZoomChanged(cb: (zoom: number) => void) {
    return this.#subscribe(this.#zoomListeners, cb);
  }
  onEditModeChanged(cb: (info: { mode: string; previousMode: string }) => void) {
    return this.#subscribe(this.#editModeListeners, cb);
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
}
