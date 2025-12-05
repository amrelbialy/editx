import { Command } from './controller/commands';
import { CreativeDocument } from './document/document.types';
import { EventBus } from './events/event-bus';
import { HistoryManager, Patch } from './history-manager';
import { LayerAPI } from './layer';
import { RendererAdapter } from './render-adapter';

export class Engine {
  #doc: CreativeDocument;
  #events = new EventBus();
  #history = new HistoryManager();
  #renderer: RendererAdapter | null;
  #dirty = new Set<string>();
  #selection: string[] = [];

  constructor(opts: { renderer?: RendererAdapter }) {
    this.#doc = {
      id: 'doc-1',
      version: 1,
      scene: null,
      layers: {},
    };

    this.#renderer = opts.renderer ?? null;
  }

  // INTERNAL
  #markDirty(patches: Patch[]) {
    patches.forEach((p) => this.#dirty.add(p.id));
  }

  exec(command: Command) {
    const patches = command.do(this.#doc);

    console.log('patches', patches);
    if (patches && patches.length > 0) {
      this.#history.push(patches);
      this.#markDirty(patches);
      this.#events.emit(
        'nodes:updated',
        patches.map((p) => p.id)
      );
    }
    console.log('this.#doc', this.#doc);
    console.log('history', this.#history);
    this.#flush();
  }

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

  // PATCH APPLICATION
  #applyPatches(patches: Patch[]) {
    patches.forEach((p) => {
      if (p.after === null) {
        delete this.#doc.layers[p.id];
      } else {
        this.#doc.layers[p.id] = p.after;
      }
      this.#dirty.add(p.id);
    });

    this.#events.emit(
      'nodes:updated',
      patches.map((p) => p.id)
    );
  }

  // RENDER FLUSH
  #flush() {
    console.log('flush', this.#renderer);
    if (!this.#renderer) return;

    const dirtyIds = [...this.#dirty];
    console.log('dirtyIds', dirtyIds);
    this.#dirty.clear();

    for (const id of dirtyIds) {
      const node = this.#doc.layers[id];
      console.log('node', node);
      this.#renderer.createLayer(id, node);
    }

    console.log('dirtyIds', dirtyIds);
    this.#renderer.renderFrame();
  }

  // Selection
  setSelection(ids: string[]) {
    this.#selection = ids;
    this.#events.emit('selection:changed', ids);
  }

  getSelection() {
    return [...this.#selection];
  }

  getRenderer() {
    return this.#renderer;
  }

  getDocument() {
    return this.#doc;
  }

  // EVENTS
  on(event: string, cb: Function) {
    return this.#events.on(event, cb);
  }

  off(event: string, cb: Function) {
    return this.#events.off(event, cb);
  }

  // SCENE
  async createScene(layout: { width: number; height: number; background: string }) {
    this.#doc.scene = {
      width: layout.width,
      height: layout.height,
      background: layout.background,
    };

    await this.#renderer?.createScene(layout);
  }
}
