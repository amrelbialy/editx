import { type ActivePageChangedEvent, ActivePageState } from "./active-page";
import { BlockAPI } from "./block/block-api";
import { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import { EditorAPI } from "./editor/editor-api";
import type { BlockExportOptions, ExportOptions } from "./editor-types";
import { exportBlock, exportPage, exportScene } from "./editx-engine-export";
import { type BlockTransformEvent, type EditModeChange, EngineCallbacks } from "./engine-callbacks";
import type { EngineCore } from "./engine-core";
import { EngineTransactions } from "./engine-transactions";
import { EventAPI } from "./event-api";
import { EventBus } from "./events/event-bus";
import type { PageOrderChangedEvent } from "./page-order";
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
  #renderer: RendererAdapter | null;
  #navigation: ActivePageState;
  #transactions: EngineTransactions;
  #disposed = false;

  // Typed public callback registrations (history / zoom / pan / edit-mode / live transform)
  #callbacks = new EngineCallbacks();

  constructor(opts?: { renderer?: RendererAdapter; blockStore?: BlockStore }) {
    this.#blockStore = opts?.blockStore ?? new BlockStore();
    this.#renderer = opts?.renderer ?? null;
    this.event = new EventAPI();
    this.#navigation = new ActivePageState(
      this.#blockStore,
      (event) => this.#callbacks.fireActivePage(event),
      (callback) => this._deferNotification(callback),
      (event) => this.#callbacks.firePageOrder(event),
    );
    this.#transactions = new EngineTransactions(this, this.#navigation, this.#callbacks);

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
  /** @internal */
  _deferNotification(callback: () => void): void {
    this.#transactions.deferNotification(callback);
  }

  /**
   * Suppresses history recording for mutations executed while active. Depth-counted so
   * re-entrant callers (e.g. a command whose flush triggers another silent-wrapped write)
   * compose correctly instead of the inner scope prematurely re-enabling history.
   */
  beginSilent() {
    this.#transactions.beginSilent();
  }
  endSilent() {
    this.#transactions.endSilent();
  }

  beginBatch() {
    this.#transactions.beginBatch();
  }

  endBatch() {
    this.#transactions.endBatch();
  }

  exec(command: Command) {
    this.#transactions.exec(command);
  }

  undo() {
    this.#transactions.undo();
  }

  redo() {
    this.#transactions.redo();
  }

  canUndo() {
    return this.#transactions.canUndo();
  }
  canRedo() {
    return this.#transactions.canRedo();
  }

  clearHistory() {
    this.#transactions.clearHistory();
  }

  /** Render all dirty blocks now. */
  renderDirty() {
    this.#transactions.renderDirty();
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
  onPageOrderChanged(cb: (event: PageOrderChangedEvent) => void) {
    return this.#callbacks.onPageOrderChanged(cb);
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

  /** Export committed page content without changing navigation, view state, or history. */
  async exportPage(pageId: number, options?: ExportOptions): Promise<Blob> {
    return exportPage(this, pageId, options);
  }

  async exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob> {
    return exportBlock(this, blockId, options);
  }
}
