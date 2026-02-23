import { BlockAPI } from './block/block-api';
import { Engine } from './engine';

export class SceneAPI {
  #engine: Engine;
  #block: BlockAPI;

  constructor(engine: Engine, block: BlockAPI) {
    this.#engine = engine;
    this.#block = block;
  }

  async create(opts: { width?: number; height?: number } = {}) {
    const width = opts.width ?? 1080;
    const height = opts.height ?? 1080;

    // Create scene block
    const sceneId = this.#block.create('scene');
    this.#block.setFloat(sceneId, 'scene/width', width);
    this.#block.setFloat(sceneId, 'scene/height', height);
    this.#engine.setActiveScene(sceneId);

    // Create first page block
    const pageId = this.#block.create('page');
    this.#block.setFloat(pageId, 'page/width', width);
    this.#block.setFloat(pageId, 'page/height', height);
    this.#block.appendChild(sceneId, pageId);
    this.#engine.setActivePage(pageId);

    // Tell renderer to set up the canvas
    const store = this.#engine.getBlockStore();
    const sceneBlock = store.get(sceneId);
    const pageBlock = store.get(pageId);
    if (sceneBlock && pageBlock) {
      await this.#engine.getRenderer()?.createScene(sceneBlock, pageBlock);
    }

    // Clear history so scene creation isn't undoable
    this.#engine.clearHistory();
  }

  getScene(): number | null {
    return this.#engine.getActiveScene();
  }

  getCurrentPage(): number | null {
    return this.#engine.getActivePage();
  }

  getPages(): number[] {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return [];
    return this.#block.getChildren(sceneId).filter(
      (id) => this.#block.getType(id) === 'page'
    );
  }

  addPage(opts: { width?: number; height?: number } = {}): number {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error('No active scene');

    const store = this.#engine.getBlockStore();
    const sceneBlock = store.get(sceneId);
    const width = opts.width ?? (sceneBlock?.properties['scene/width'] as number) ?? 1080;
    const height = opts.height ?? (sceneBlock?.properties['scene/height'] as number) ?? 1080;

    const pageId = this.#block.create('page');
    this.#block.setFloat(pageId, 'page/width', width);
    this.#block.setFloat(pageId, 'page/height', height);
    this.#block.appendChild(sceneId, pageId);

    return pageId;
  }

  setActivePage(pageId: number): void {
    this.#engine.setActivePage(pageId);
  }
}
