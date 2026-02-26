import { BlockStore } from './block/block-store';
import { BlockData } from './block/block.types';
import { Command } from './controller/commands';
import { EventAPI, BlockEvent } from './event-api';
import { EventBus } from './events/event-bus';
import { HistoryManager, Patch } from './history-manager';
import { RendererAdapter } from './render-adapter';

export class Engine {
  #blockStore: BlockStore;
  #events = new EventBus();
  #eventApi: EventAPI;
  #history = new HistoryManager();
  #renderer: RendererAdapter | null;
  #dirty = new Set<number>();
  #selection: number[] = [];

  #activeSceneId: number | null = null;
  #activePageId: number | null = null;

  #batching = false;
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
    this.#batching = true;
    this.#batchPatches = [];
  }

  endBatch() {
    this.#batching = false;
    if (this.#batchPatches.length > 0) {
      this.#history.push(this.#batchPatches);
      this.#enqueueBlockEvents(this.#batchPatches);
    }
    this.#batchPatches = [];
    this.#flush();
  }

  // --- Command execution ---

  exec(command: Command) {
    const patches = command.do();

    if (patches && patches.length > 0) {
      this.#markDirty(patches);

      if (this.#batching) {
        this.#batchPatches.push(...patches);
      } else {
        this.#history.push(patches);
        this.#enqueueBlockEvents(patches);
      }
    }

    if (!this.#batching) {
      this.#flush();
    }
  }

  #markDirty(patches: Patch[]) {
    patches.forEach((p) => this.#dirty.add(Number(p.id)));
  }

  #enqueueBlockEvents(patches: Patch[]) {
    for (const p of patches) {
      const blockId = Number(p.id);
      let type: BlockEvent['type'];
      if (p.before === null) {
        type = 'created';
      } else if (p.after === null) {
        type = 'destroyed';
      } else {
        type = 'updated';
      }
      this.#eventApi._enqueue({ type, block: blockId });
    }
  }

  // --- Undo / Redo ---

  undo() {
    const patches = this.#history.undo();
    if (!patches) return;

    this.#applyPatches(patches);
    this.#events.emit('history:undo');
    this.#flush();
  }

  redo() {
    const patches = this.#history.redo();
    if (!patches) return;

    this.#applyPatches(patches);
    this.#events.emit('history:redo');
    this.#flush();
  }

  canUndo() {
    return this.#history.canUndo();
  }

  canRedo() {
    return this.#history.canRedo();
  }

  clearHistory() {
    this.#history.clear();
    this.#events.emit('history:clear');
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

    const dirtyIds = [...this.#dirty];
    this.#dirty.clear();

    for (const id of dirtyIds) {
      const block = this.#blockStore.get(id);
      if (block) {
        this.#renderer.syncBlock(id, block);
      } else {
        this.#renderer.removeBlock(id);
      }
    }

    this.#renderer.renderFrame();

    // Deliver bundled events AFTER render — end of update cycle
    this.#eventApi._flush();
  }

  // --- Selection ---

  setSelection(ids: number[]) {
    this.#selection = ids;
    this.#events.emit('selection:changed', ids);

    if (ids.length > 0) {
      this.#renderer?.showTransformer(ids);
    } else {
      this.#renderer?.hideTransformer();
    }
  }

  getSelection(): number[] {
    return [...this.#selection];
  }

  // --- Legacy events (selection, stage:click, history) ---

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
