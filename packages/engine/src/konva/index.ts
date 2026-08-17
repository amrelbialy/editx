import { POSITION_X, SIZE_HEIGHT, SIZE_WIDTH, TEXT_ALIGN } from "../block/property-keys";
import { EditxEngine } from "../editx-engine";
import { KonvaRendererAdapter } from "./konva-renderer-adapter";
import { commitBlockTransform } from "./konva-transform-commit";

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
      // A plain click on a block OUTSIDE the active context exits the context.
      if (!event.insideContext && engine.block.getGroupContext().length > 0) {
        engine.block._clearGroupContext();
      }
      engine.block.select(blockId);
    }
  };
  adapter.onBlockDblClick = (blockId, screenPos) =>
    engine.emit("block:dblclick", blockId, screenPos);
  adapter.onEnterGroup = (groupId, childId) => {
    engine.block.enterGroup(groupId);
    if (childId != null) {
      engine.block.select(childId);
    } else {
      engine.block.deselectAll();
    }
  };
  adapter.onStageClick = (worldPos) => {
    engine.block._clearGroupContext();
    engine.block.deselectAll();
    engine.emit("stage:click", worldPos);
  };
  engine.block.onGroupContextChanged((stack) => adapter.setGroupContext?.(stack));
  adapter.onZoomChange = (zoom) => engine.emit("zoom:changed", zoom);
  adapter.onPanChange = (pan) => engine.emit("pan:changed", pan);
  adapter.onBlockTransform = (blockId, phase) =>
    engine.emit("block:transform", { block: blockId, phase });
  adapter.onBlockDragEnd = (blockId, x, y) => engine.block.setPosition(blockId, x, y);

  adapter.onBlockTransformEnd = (blockId, transform, anchorName) =>
    commitBlockTransform(engine, blockId, transform, anchorName);

  adapter.onAutoSize = (blockId, computedHeight) => {
    const target = Math.max(computedHeight, 10);
    const current = engine.block.getFloat(blockId, SIZE_HEIGHT);
    if (Math.abs(current - target) <= 0.5) return;

    engine.beginSilent();
    engine.beginBatch();
    try {
      engine.block.setFloat(blockId, SIZE_HEIGHT, target);
      const parentId = engine.block.getParent(blockId);
      if (parentId != null) engine.block.refitGroupBounds(parentId);
    } finally {
      engine.endBatch();
      engine.endSilent();
    }
  };

  adapter.onAutoWidth = (blockId, computedWidth) => {
    const target = Math.max(computedWidth, 10);
    const current = engine.block.getFloat(blockId, SIZE_WIDTH);
    if (Math.abs(current - target) <= 0.5) return;

    // An auto-width box grows from its left edge, so centre/right aligned text
    // would visually drift as it resizes. Re-anchor x by the width delta so the
    // aligned edge stays put; "left" (the default) needs no move.
    const align = engine.block.getString(blockId, TEXT_ALIGN);
    const shift =
      align === "center" ? (current - target) / 2 : align === "right" ? current - target : 0;

    engine.beginSilent();
    engine.beginBatch();
    try {
      // Position and size move together inside one silent block: atomic on
      // screen, and no undo entry for either.
      if (shift !== 0) {
        engine.block.setFloat(
          blockId,
          POSITION_X,
          engine.block.getFloat(blockId, POSITION_X) + shift,
        );
      }
      engine.block.setFloat(blockId, SIZE_WIDTH, target);
      const parentId = engine.block.getParent(blockId);
      if (parentId != null) engine.block.refitGroupBounds(parentId);
    } finally {
      engine.endBatch();
      engine.endSilent();
    }
  };
  adapter.resolveBlock = (id) => engine._getBlockStore().get(id);

  return engine;
}
