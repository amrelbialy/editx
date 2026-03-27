import { EditxEngine } from "../editx-engine";
import { KonvaRendererAdapter } from "./konva-renderer-adapter";

export { KonvaCropOverlay } from "./konva-crop-overlay";
export { KonvaRendererAdapter } from "./konva-renderer-adapter";

/** Create a EditxEngine with a Konva renderer attached to the given DOM container. */
export async function createEngine(opts: { container: HTMLElement }): Promise<EditxEngine> {
  const adapter = new KonvaRendererAdapter();
  await adapter.init(opts.container);

  const engine = new EditxEngine({ renderer: adapter });

  adapter.onBlockClick = (blockId, event) => {
    if (event.shiftKey) {
      engine.block.setSelected(blockId, !engine.block.isSelected(blockId));
    } else {
      engine.block.select(blockId);
    }
  };
  adapter.onBlockDblClick = (blockId) => engine.emit("block:dblclick", blockId);
  adapter.onStageClick = (worldPos) => {
    engine.block.deselectAll();
    engine.emit("stage:click", worldPos);
  };
  adapter.onZoomChange = (zoom) => engine.emit("zoom:changed", zoom);
  adapter.onBlockDragEnd = (blockId, x, y) => engine.block.setPosition(blockId, x, y);
  adapter.onBlockTransformEnd = (blockId, transform) => {
    engine.beginBatch();
    engine.block.setPosition(blockId, transform.x, transform.y);
    engine.block.setSize(blockId, transform.width, transform.height);
    engine.block.setRotation(blockId, transform.rotation);
    if (engine.block.getType(blockId) === "text") {
      engine.block.setBool(blockId, "text/autoHeight", false);
    }
    engine.endBatch();
  };

  adapter.onAutoSize = (blockId, computedHeight) => {
    const store = engine.getBlockStore();
    const current = store.getFloat(blockId, "transform/size/height");
    if (Math.abs(current - computedHeight) > 0.5) {
      store.setProperty(blockId, "transform/size/height", Math.max(computedHeight, 10));
    }
  };
  adapter.resolveBlock = (id) => engine.getBlockStore().get(id);

  return engine;
}
