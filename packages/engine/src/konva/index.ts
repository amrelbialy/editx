import type { TextBackgroundPadding } from "../block/block.types";
import {
  POSITION_X,
  SHAPE_RECT_CORNER_RADIUS,
  SIZE_HEIGHT,
  SIZE_WIDTH,
  TEXT_ALIGN,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_PADDING,
} from "../block/property-keys";
import { EditxEngine } from "../editx-engine";
import { KonvaRendererAdapter } from "./konva-renderer-adapter";

const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const BACKGROUND_GEOMETRY_KEYS = [
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
] as const;

function scaleGeometry(value: number, scaleFactor: number): number {
  return Math.round(value * scaleFactor * 10) / 10;
}

function scalePadding(
  padding: Partial<TextBackgroundPadding>,
  scaleFactor: number,
): Partial<TextBackgroundPadding> {
  const scaled = { ...padding };
  for (const side of ["top", "right", "bottom", "left"] as const) {
    if (padding[side] !== undefined) scaled[side] = scaleGeometry(padding[side], scaleFactor);
  }
  return scaled;
}

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

  adapter.onBlockTransformEnd = (blockId, transform, anchorName) => {
    engine.beginBatch();
    const blockType = engine.block.getType(blockId);
    const isText = blockType === "text";
    const isCorner = CORNER_ANCHORS.has(anchorName ?? "");
    const oldSize = isCorner || blockType === "graphic" ? engine.block.getSize(blockId) : null;
    const scaleFactor = oldSize
      ? Math.sqrt((transform.width / oldSize.width) * (transform.height / oldSize.height))
      : 1;

    // Scale font sizes only on corner resize (pills just resize the container)
    if (isText && isCorner) {
      if (Math.abs(scaleFactor - 1) > 0.001) {
        const runs = engine.block.getTextRuns(blockId);
        const scaledRuns = runs.map((run) => ({
          ...run,
          style: {
            ...run.style,
            fontSize: run.style.fontSize
              ? scaleGeometry(run.style.fontSize, scaleFactor)
              : run.style.fontSize,
            ...(run.style.backgroundPadding && {
              backgroundPadding: scalePadding(run.style.backgroundPadding, scaleFactor),
            }),
            ...(run.style.backgroundCornerRadius !== undefined && {
              backgroundCornerRadius: scaleGeometry(run.style.backgroundCornerRadius, scaleFactor),
            }),
          },
        }));
        engine.block.setProperty(blockId, "text/runs", scaledRuns);
        engine.block.setFloat(
          blockId,
          TEXT_PADDING,
          scaleGeometry(engine.block.getFloat(blockId, TEXT_PADDING), scaleFactor),
        );
        if (engine.block.isTextBackgroundEnabled(blockId)) {
          for (const key of BACKGROUND_GEOMETRY_KEYS) {
            if (engine.block.getProperty(blockId, key) !== undefined) {
              engine.block.setFloat(
                blockId,
                key,
                scaleGeometry(engine.block.getFloat(blockId, key), scaleFactor),
              );
            }
          }
        }
      }
    }

    if (blockType === "graphic" && Math.abs(scaleFactor - 1) > 0.001) {
      const strokeWidth = engine.block.getStrokeWidth(blockId);
      if (strokeWidth > 0) {
        engine.block.setStrokeWidth(blockId, scaleGeometry(strokeWidth, scaleFactor));
      }

      const shapeId = engine.block.getShape(blockId);
      if (shapeId != null && engine.block.getKind(shapeId) === "rect") {
        const cornerRadius = engine.block.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS);
        if (cornerRadius > 0) {
          engine.block.setFloat(
            shapeId,
            SHAPE_RECT_CORNER_RADIUS,
            scaleGeometry(cornerRadius, scaleFactor),
          );
        }
      }
    }

    engine.block.setPosition(blockId, transform.x, transform.y);
    // Group size derives from children — never write a size onto the group block.
    if (engine.block.getType(blockId) !== "group") {
      engine.block.setSize(blockId, transform.width, transform.height);
    }
    engine.block.setRotation(blockId, transform.rotation);
    if (isText) {
      engine.block.setBool(blockId, "text/autoHeight", false);
      // An explicit width resize should stick, so disable content auto-width.
      engine.block.setBool(blockId, "text/autoWidth", false);
    }
    engine.endBatch();
  };

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
