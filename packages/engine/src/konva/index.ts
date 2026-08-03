import { SIZE_HEIGHT } from "../block/property-keys";
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
    if (event.additive) {
      // Marquee selection always adds hit blocks to the current selection.
      engine.block.setSelected(blockId, true);
    } else if (event.shiftKey) {
      // Shift-click on a single block toggles its membership.
      engine.block.setSelected(blockId, !engine.block.isSelected(blockId));
    } else {
      engine.block.select(blockId);
    }
  };
  adapter.onBlockDblClick = (blockId, screenPos) =>
    engine.emit("block:dblclick", blockId, screenPos);
  adapter.onStageClick = (worldPos) => {
    engine.block.deselectAll();
    engine.emit("stage:click", worldPos);
  };
  adapter.onZoomChange = (zoom) => engine.emit("zoom:changed", zoom);
  adapter.onPanChange = (pan) => engine.emit("pan:changed", pan);
  adapter.onBlockTransform = (blockId, phase) =>
    engine.emit("block:transform", { block: blockId, phase });
  adapter.onBlockDragEnd = (blockId, x, y) => engine.block.setPosition(blockId, x, y);
  const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);

  adapter.onBlockTransformEnd = (blockId, transform, anchorName) => {
    engine.beginBatch();
    const isText = engine.block.getType(blockId) === "text";
    const isCorner = CORNER_ANCHORS.has(anchorName ?? "");

    // Scale font sizes only on corner resize (pills just resize the container)
    if (isText && isCorner) {
      const oldSize = engine.block.getSize(blockId);
      const scaleX = transform.width / oldSize.width;
      const scaleY = transform.height / oldSize.height;
      const scaleFactor = Math.sqrt(scaleX * scaleY);
      if (Math.abs(scaleFactor - 1) > 0.001) {
        const runs = engine.block.getTextRuns(blockId);
        const scaledRuns = runs.map((run) => ({
          ...run,
          style: {
            ...run.style,
            fontSize: run.style.fontSize
              ? Math.round(run.style.fontSize * scaleFactor * 10) / 10
              : run.style.fontSize,
          },
        }));
        engine.block.setProperty(blockId, "text/runs", scaledRuns);
      }
    }

    engine.block.setPosition(blockId, transform.x, transform.y);
    engine.block.setSize(blockId, transform.width, transform.height);
    engine.block.setRotation(blockId, transform.rotation);
    if (isText) {
      engine.block.setBool(blockId, "text/autoHeight", false);
    }
    engine.endBatch();
  };

  adapter.onAutoSize = (blockId, computedHeight) => {
    const target = Math.max(computedHeight, 10);
    const current = engine.block.getFloat(blockId, SIZE_HEIGHT);
    if (Math.abs(current - target) <= 0.5) return;

    engine.beginSilent();
    try {
      engine.block.setFloat(blockId, SIZE_HEIGHT, target);
    } finally {
      engine.endSilent();
    }
  };
  adapter.resolveBlock = (id) => engine._getBlockStore().get(id);

  return engine;
}
