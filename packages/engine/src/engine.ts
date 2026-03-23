import type { BlockData } from "./block/block.types";
import { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import { type BlockEvent, EventAPI } from "./event-api";
import { EventBus } from "./events/event-bus";
import { HistoryManager, type Patch } from "./history-manager";
import type { RendererAdapter } from "./render-adapter";

export class Engine {
  #blockStore: BlockStore;
  #events = new EventBus();
  #eventApi: EventAPI;
  #history = new HistoryManager();
  #renderer: RendererAdapter | null;
  #dirty = new Set<number>();

  #activeSceneId: number | null = null;
  #activePageId: number | null = null;

  #batchDepth = 0;
  #batchPatches: Patch[] = [];

  constructor(opts: { renderer?: RendererAdapter; blockStore?: BlockStore }) {
    this.#blockStore = opts.blockStore ?? new BlockStore();
    this.#renderer = opts.renderer ?? null;
    this.#eventApi = new EventAPI();
  }

  get event(): EventAPI {
    return this.#eventApi;
  }

  getBlockStore(): BlockStore {
    return this.#blockStore;
  }

  getRenderer(): RendererAdapter | null {
    return this.#renderer;
  }

  // --- Active scene/page ---

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

  // --- Batch ---

  beginBatch() {
    if (this.#batchDepth === 0) {
      this.#batchPatches = [];
    }
    this.#batchDepth++;
  }

  endBatch() {
    if (this.#batchDepth <= 0) return;
    this.#batchDepth--;
    if (this.#batchDepth === 0) {
      if (this.#batchPatches.length > 0) {
        this.#history.push(this.#batchPatches);
        this.#enqueueBlockEvents(this.#batchPatches);
      }
      this.#batchPatches = [];
      this.#flush();
    }
  }

  // --- Command execution ---

  exec(command: Command) {
    const patches = command.do();

    if (patches && patches.length > 0) {
      this.#markDirty(patches);

      if (this.#batchDepth > 0) {
        this.#batchPatches.push(...patches);
      } else {
        this.#history.push(patches);
        this.#enqueueBlockEvents(patches);
      }
    }

    if (this.#batchDepth === 0) {
      this.#flush();
    }
  }

  #markDirty(patches: Patch[]) {
    patches.forEach((p) => this.#dirty.add(Number(p.id)));
  }

  #enqueueBlockEvents(patches: Patch[]) {
    for (const p of patches) {
      const blockId = Number(p.id);
      let type: BlockEvent["type"];
      if (p.before === null) {
        type = "created";
      } else if (p.after === null) {
        type = "destroyed";
      } else {
        type = "updated";
      }
      this.#eventApi._enqueue({ type, block: blockId });
    }
  }

  // --- Undo / Redo ---

  /** @internal — called after undo/redo to remove destroyed blocks from selection. */
  #onSelectionCleanup: ((destroyedIds: number[]) => void) | null = null;

  /** @internal — register a callback to clean stale selections after undo/redo. */
  _setSelectionCleanup(cb: (destroyedIds: number[]) => void): void {
    this.#onSelectionCleanup = cb;
  }

  undo() {
    const patches = this.#history.undo();
    if (!patches) return;

    this.#applyPatches(patches);
    this.#cleanupSelections(patches);
    this.#events.emit("history:undo");
    this.#flush();
  }

  redo() {
    const patches = this.#history.redo();
    if (!patches) return;

    this.#applyPatches(patches);
    this.#cleanupSelections(patches);
    this.#events.emit("history:redo");
    this.#flush();
  }

  #cleanupSelections(patches: Patch[]) {
    if (!this.#onSelectionCleanup) return;
    const destroyed = patches.filter((p) => p.after === null).map((p) => Number(p.id));
    if (destroyed.length > 0) {
      this.#onSelectionCleanup(destroyed);
    }
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
  }

  /** Render all dirty blocks now. Useful during a batch for live visual preview. */
  renderDirty() {
    this.#flush();
  }

  // --- Patch application (undo/redo) ---

  #applyPatches(patches: Patch[]) {
    for (const p of patches) {
      const numId = Number(p.id);
      if (p.after === null) {
        this.#blockStore.destroy(numId);
      } else {
        this.#blockStore.restore(p.after as BlockData);
      }
      this.#dirty.add(numId);
    }

    this.#enqueueBlockEvents(patches);
  }

  // --- Render flush ---

  #flush() {
    if (!this.#renderer) return;

    // When a sub-block (fill, shape, or effect) changes, its owner
    // graphic block must also re-render so the visual update is applied.
    for (const id of [...this.#dirty]) {
      const block = this.#blockStore.get(id);
      if (block && (block.type === "effect" || block.type === "fill" || block.type === "shape")) {
        const ownerId = this.#blockStore.findSubBlockOwner(id);
        if (ownerId !== null) this.#dirty.add(ownerId);
      }
    }

    const dirtyIds = [...this.#dirty];
    this.#dirty.clear();

    const t0 = typeof window !== "undefined" && (window as any).__CE_PERF ? performance.now() : 0;
    for (const id of dirtyIds) {
      const block = this.#blockStore.get(id);
      if (block) {
        this.#renderer.syncBlock(id, block);
      } else {
        this.#renderer.removeBlock(id);
      }
    }

    // Sync child z-order AFTER all blocks are synced (so all Konva nodes exist)
    for (const id of dirtyIds) {
      const block = this.#blockStore.get(id);
      if (block?.type === "page" && block.children.length > 0) {
        this.#renderer.syncChildOrder?.(block.children);
      }
    }
    const tSync =
      typeof window !== "undefined" && (window as any).__CE_PERF ? performance.now() : 0;

    this.#renderer.renderFrame();
    if (typeof window !== "undefined" && (window as any).__CE_PERF) {
      const tEnd = performance.now();
      console.log(
        `[perf:flush] syncBlocks: ${(tSync - t0).toFixed(2)}ms | renderFrame: ${(tEnd - tSync).toFixed(2)}ms | total: ${(tEnd - t0).toFixed(2)}ms (${dirtyIds.length} dirty)`,
      );
    }

    // Deliver bundled events AFTER render — end of update cycle
    this.#eventApi._flush();
  }

  // --- Events (selection, stage:click, history) ---

  on(event: string, cb: (...args: any[]) => void) {
    return this.#events.on(event, cb);
  }

  off(event: string, cb: (...args: any[]) => void) {
    return this.#events.off(event, cb);
  }

  emit(event: string, ...args: any[]) {
    this.#events.emit(event, ...args);
  }
}
