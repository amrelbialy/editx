import { BlockAPI } from './block/block-api';
import { Engine } from './engine';
import { EditorAPI } from './editor';
import { EventAPI } from './event-api';
import { SceneAPI } from './scene';
import { KonvaRendererAdapter } from './konva/konva-renderer-adapter';
import { clearImageCache } from './utils/image-loader';

export class CreativeEngine {
  block: BlockAPI;
  editor: EditorAPI;
  event: EventAPI;
  scene: SceneAPI;
  core: Engine;

  #disposed = false;

  private constructor(params: {
    core: Engine;
    block: BlockAPI;
    editor: EditorAPI;
    scene: SceneAPI;
  }) {
    this.core = params.core;
    this.block = params.block;
    this.editor = params.editor;
    this.scene = params.scene;
    this.event = params.core.event;
  }

  /** Clean up the engine, renderer, and caches. Safe to call multiple times. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.core.getRenderer()?.dispose();
    clearImageCache();
  }

  static async create(opts: { container: HTMLElement }) {
    const adapter = new KonvaRendererAdapter();
    await adapter.init(opts.container);

    const core = new Engine({ renderer: adapter });
    const block = new BlockAPI(core);
    const editor = new EditorAPI(core);
    const scene = new SceneAPI(core, block);

    adapter.onBlockClick = (blockId, event) => {
      const current = core.getSelection();
      if (event.shiftKey) {
        if (current.includes(blockId)) {
          core.setSelection(current.filter((id) => id !== blockId));
        } else {
          core.setSelection([...current, blockId]);
        }
      } else {
        core.setSelection([blockId]);
      }
    };

    adapter.onStageClick = (worldPos) => {
      core.setSelection([]);
      core.emit('stage:click', worldPos);
    };

    adapter.onBlockDragEnd = (blockId, x, y) => {
      block.setPosition(blockId, x, y);
    };

    adapter.onBlockTransformEnd = (blockId, transform) => {
      core.beginBatch();
      block.setPosition(blockId, transform.x, transform.y);
      block.setSize(blockId, transform.width, transform.height);
      block.setRotation(blockId, transform.rotation);
      core.endBatch();
    };

    return new CreativeEngine({ core, block, editor, scene });
  }
}
