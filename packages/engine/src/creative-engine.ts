import { BlockAPI } from './block/block-api';
import { Engine } from './engine';
import { EditorAPI } from './editor/editor-api';
import type { ExportOptions } from './editor-types';
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

  /** Subscribe to an engine event. */
  on(event: string, cb: (...args: any[]) => void) {
    return this.core.on(event, cb);
  }

  /** Unsubscribe from an engine event. */
  off(event: string, cb: (...args: any[]) => void) {
    return this.core.off(event, cb);
  }

  /**
   * Render the current page (with all edits) to an offscreen canvas and
   * return the result as a Blob.
   */
  async exportScene(options?: ExportOptions): Promise<Blob> {
    const renderer = this.core.getRenderer();
    if (!renderer) throw new Error('Cannot export: no renderer attached');
    return renderer.exportScene({
      format: options?.format ?? 'png',
      quality: options?.quality ?? 0.92,
      pixelRatio: options?.pixelRatio ?? 1,
    });
  }

  static async create(opts: { container: HTMLElement }) {
    const adapter = new KonvaRendererAdapter();
    await adapter.init(opts.container);

    const core = new Engine({ renderer: adapter });
    const block = new BlockAPI(core);
    const editor = new EditorAPI(core);
    editor._setBlockAPI(block);
    // Wire up crop overlay routing: block.applyCropRatio → editor crop module
    block._setApplyCropRatioHandler((ratio) => editor._getCrop().applyCropRatio(ratio));
    block._setApplyCropDimensionsHandler((w, h) => editor._getCrop().applyCropDimensions(w, h));
    block._setGetCropVisualDimensionsHandler(() => editor._getCrop().getCropVisualDimensions());
    const scene = new SceneAPI(core, block);

    // Wire up selection cleanup so undo/redo removes stale selections
    core._setSelectionCleanup((destroyedIds) => block._removeFromSelection(destroyedIds));

    adapter.onBlockClick = (blockId, event) => {
      if (event.shiftKey) {
        const selected = block.isSelected(blockId);
        block.setSelected(blockId, !selected);
      } else {
        block.select(blockId);
      }
    };

    adapter.onBlockDblClick = (blockId) => {
      core.emit('block:dblclick', blockId);
    };

    adapter.onStageClick = (worldPos) => {
      block.deselectAll();
      core.emit('stage:click', worldPos);
    };

    adapter.onZoomChange = (zoom: number) => {
      core.emit('zoom:changed', zoom);
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

    // Let the renderer resolve effect blocks for filter pipeline
    adapter.resolveBlock = (id) => core.getBlockStore().get(id);

    return new CreativeEngine({ core, block, editor, scene });
  }
}
