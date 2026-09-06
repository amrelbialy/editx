import type { TextBackgroundPadding, TextRunStyle } from "../block/block.types";
import {
  FONT_SIZE,
  SHADOW_BLUR,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_RECT_CORNER_RADIUS,
  TEXT_AUTO_HEIGHT,
  TEXT_AUTO_WIDTH,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_CURVE_RADIUS,
  TEXT_PADDING,
} from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import type { BlockTransform } from "../render-adapter";

const EPSILON = 0.001;
const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const BACKGROUND_GEOMETRY_KEYS = [
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
] as const;
const RUN_GEOMETRY_KEYS = [
  "fontSize",
  "letterSpacing",
  "backgroundCornerRadius",
  "textShadowBlur",
  "textShadowOffsetX",
  "textShadowOffsetY",
  "textStrokeWidth",
] as const satisfies readonly (keyof TextRunStyle)[];

export function commitBlockTransform(
  engine: EditxEngine,
  blockId: number,
  transform: BlockTransform,
  anchorName?: string,
): void {
  engine.beginBatch();
  try {
    if (engine.block.getType(blockId) === "group") {
      commitGroupTransform(engine, blockId, transform);
    } else {
      commitLeafTransform(engine, blockId, transform, anchorName);
    }
  } finally {
    engine.endBatch();
  }
}

function commitGroupTransform(
  engine: EditxEngine,
  groupId: number,
  transform: BlockTransform,
): void {
  engine.block.setPosition(groupId, transform.x, transform.y);
  engine.block.setRotation(groupId, transform.rotation);

  const scaleFactor = uniformScale(transform);
  if (scaleFactor !== null && Math.abs(scaleFactor - 1) > EPSILON) {
    const descendantGroups: number[] = [];
    scaleGroupChildren(engine, groupId, scaleFactor, descendantGroups);
    for (const descendantId of descendantGroups) {
      engine.block.refitGroupBounds(descendantId);
    }
  }
  engine.block.refitGroupBounds(groupId);
}

function uniformScale(transform: BlockTransform): number | null {
  const { scaleX, scaleY } = transform;
  if (
    scaleX === undefined ||
    scaleY === undefined ||
    !Number.isFinite(scaleX) ||
    !Number.isFinite(scaleY) ||
    scaleX <= 0 ||
    scaleY <= 0
  ) {
    return null;
  }
  const tolerance = Math.max(scaleX, scaleY) * EPSILON;
  return Math.abs(scaleX - scaleY) <= tolerance ? (scaleX + scaleY) / 2 : null;
}

function scaleGroupChildren(
  engine: EditxEngine,
  groupId: number,
  scaleFactor: number,
  descendantGroups: number[],
): void {
  for (const childId of engine.block.getChildren(groupId)) {
    const { x, y } = engine.block.getPosition(childId);
    engine.block.setPosition(childId, scaleGeometry(x, scaleFactor), scaleGeometry(y, scaleFactor));

    if (engine.block.getType(childId) === "group") {
      scaleGroupChildren(engine, childId, scaleFactor, descendantGroups);
      descendantGroups.push(childId);
      continue;
    }

    const { width, height } = engine.block.getSize(childId);
    engine.block.setSize(
      childId,
      scaleGeometry(width, scaleFactor),
      scaleGeometry(height, scaleFactor),
    );
    scaleLeafGeometry(engine, childId, scaleFactor);
  }
}

function commitLeafTransform(
  engine: EditxEngine,
  blockId: number,
  transform: BlockTransform,
  anchorName?: string,
): void {
  const blockType = engine.block.getType(blockId);
  const isText = blockType === "text";
  const isCorner = CORNER_ANCHORS.has(anchorName ?? "");
  const oldSize = isCorner || blockType === "graphic" ? engine.block.getSize(blockId) : null;
  const scaleFactor = oldSize
    ? Math.sqrt((transform.width / oldSize.width) * (transform.height / oldSize.height))
    : 1;

  if (Number.isFinite(scaleFactor) && Math.abs(scaleFactor - 1) > EPSILON) {
    if ((isText && isCorner) || blockType === "graphic") {
      scaleLeafGeometry(engine, blockId, scaleFactor);
    }
  }

  engine.block.setPosition(blockId, transform.x, transform.y);
  engine.block.setSize(blockId, transform.width, transform.height);
  engine.block.setRotation(blockId, transform.rotation);
  if (isText) disableTextAutoSize(engine, blockId);
}

function scaleLeafGeometry(engine: EditxEngine, blockId: number, scaleFactor: number): void {
  const blockType = engine.block.getType(blockId);
  if (blockType === "text") scaleTextGeometry(engine, blockId, scaleFactor);
  if (blockType === "graphic") scaleGraphicGeometry(engine, blockId, scaleFactor);
  scaleShadowGeometry(engine, blockId, scaleFactor);
}

function scaleTextGeometry(engine: EditxEngine, blockId: number, scaleFactor: number): void {
  const runs = engine.block.getTextRuns(blockId);
  const scaledRuns = runs.map((run) => {
    const style = { ...run.style };
    for (const key of RUN_GEOMETRY_KEYS) {
      const value = style[key];
      if (typeof value === "number") style[key] = scaleGeometry(value, scaleFactor);
    }
    if (style.backgroundPadding) {
      style.backgroundPadding = scalePadding(style.backgroundPadding, scaleFactor);
    }
    return { ...run, style };
  });
  engine.block.setProperty(blockId, "text/runs", scaledRuns);
  scalePropertyIfPresent(engine, blockId, FONT_SIZE, scaleFactor);
  scalePropertyIfPresent(engine, blockId, TEXT_PADDING, scaleFactor);
  scalePropertyIfPresent(engine, blockId, TEXT_CURVE_RADIUS, scaleFactor);
  if (engine.block.isTextBackgroundEnabled(blockId)) {
    for (const key of BACKGROUND_GEOMETRY_KEYS) {
      scalePropertyIfPresent(engine, blockId, key, scaleFactor);
    }
  }
  disableTextAutoSize(engine, blockId);
}

function scaleGraphicGeometry(engine: EditxEngine, blockId: number, scaleFactor: number): void {
  const strokeWidth = engine.block.getStrokeWidth(blockId);
  if (strokeWidth > 0) {
    engine.block.setStrokeWidth(blockId, scaleGeometry(strokeWidth, scaleFactor));
  }

  const shapeId = engine.block.getShape(blockId);
  if (shapeId == null) return;
  const shapeKind = engine.block.getKind(shapeId);
  if (shapeKind === "rect") {
    scalePositiveProperty(engine, shapeId, SHAPE_RECT_CORNER_RADIUS, scaleFactor);
  } else if (shapeKind === "line") {
    scalePositiveProperty(engine, shapeId, SHAPE_LINE_POINTER_LENGTH, scaleFactor);
    scalePositiveProperty(engine, shapeId, SHAPE_LINE_POINTER_WIDTH, scaleFactor);
  }
}

function scaleShadowGeometry(engine: EditxEngine, blockId: number, scaleFactor: number): void {
  if (!engine.block.supportsShadow(blockId) || !engine.block.isShadowEnabled(blockId)) return;
  scalePropertyIfPresent(engine, blockId, SHADOW_OFFSET_X, scaleFactor);
  scalePropertyIfPresent(engine, blockId, SHADOW_OFFSET_Y, scaleFactor);
  scalePropertyIfPresent(engine, blockId, SHADOW_BLUR, scaleFactor);
}

function scalePositiveProperty(
  engine: EditxEngine,
  blockId: number,
  key: string,
  scaleFactor: number,
): void {
  const value = engine.block.getFloat(blockId, key);
  if (value > 0) engine.block.setFloat(blockId, key, scaleGeometry(value, scaleFactor));
}

function scalePropertyIfPresent(
  engine: EditxEngine,
  blockId: number,
  key: string,
  scaleFactor: number,
): void {
  if (engine.block.getProperty(blockId, key) === undefined) return;
  engine.block.setFloat(
    blockId,
    key,
    scaleGeometry(engine.block.getFloat(blockId, key), scaleFactor),
  );
}

function disableTextAutoSize(engine: EditxEngine, blockId: number): void {
  engine.block.setBool(blockId, TEXT_AUTO_HEIGHT, false);
  engine.block.setBool(blockId, TEXT_AUTO_WIDTH, false);
}

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
