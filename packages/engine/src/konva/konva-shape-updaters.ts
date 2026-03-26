import type Konva from "konva";
import type { BlockData, Color } from "../block/block.types";
import {
  FILL_COLOR,
  FILL_ENABLED,
  FILL_SOLID_COLOR,
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_POLYGON_SIDES,
  SHAPE_RECT_CORNER_RADIUS,
  SHAPE_STAR_INNER_DIAMETER,
  SHAPE_STAR_POINTS,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_WIDTH,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";

/** Resolve fill and stroke from sub-blocks (or fall back to block properties). */
export function applyShapeFillStroke(
  node: Konva.Shape,
  props: Record<string, unknown>,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  let fillColor: Color | undefined;
  let fillEnabled = true;
  let strokeColor: Color | undefined;
  let strokeEnabled = false;
  let strokeW = 0;

  if (block?.fillId != null && resolveBlock) {
    const fillBlock = resolveBlock(block.fillId);
    if (fillBlock) {
      const c = fillBlock.properties[FILL_SOLID_COLOR];
      if (c && typeof c === "object") fillColor = c as Color;
    }
  }

  fillEnabled = (props[FILL_ENABLED] as boolean) ?? true;
  strokeEnabled = (props[STROKE_ENABLED] as boolean) ?? false;

  const sc = props[STROKE_COLOR];
  if (sc && typeof sc === "object") strokeColor = sc as Color;
  strokeW = (props[STROKE_WIDTH] as number) ?? 0;

  if (!fillColor) {
    const fc = props[FILL_COLOR];
    if (fc && typeof fc === "object") fillColor = fc as Color;
  }

  if (fillEnabled && fillColor) {
    node.fill(colorToHex(fillColor));
  } else {
    node.fill("");
  }

  if (strokeEnabled && strokeColor && strokeW > 0) {
    node.stroke(colorToHex(strokeColor));
    node.strokeWidth(strokeW);
  } else {
    node.stroke("");
    node.strokeWidth(0);
  }

  const shadowEnabled = (props[SHADOW_ENABLED] as boolean) ?? false;
  if (shadowEnabled) {
    const sc = props[SHADOW_COLOR];
    node.shadowColor(sc && typeof sc === "object" ? colorToHex(sc as Color) : "rgba(0,0,0,0.5)");
    node.shadowOffsetX((props[SHADOW_OFFSET_X] as number) ?? 4);
    node.shadowOffsetY((props[SHADOW_OFFSET_Y] as number) ?? 4);
    node.shadowBlur((props[SHADOW_BLUR] as number) ?? 8);
    node.shadowEnabled(true);
    node.shadowForStrokeEnabled(false);
  } else {
    node.shadowEnabled(false);
  }
}

export function updateEllipseNode(
  node: Konva.Ellipse,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  node.radiusX(width / 2);
  node.radiusY(height / 2);
  applyShapeFillStroke(node, props, block, resolveBlock);
}

export function updateRectNode(
  node: Konva.Rect,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  node.width(width);
  node.height(height);

  let cornerRadius = 0;
  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      cornerRadius = (shapeBlock.properties[SHAPE_RECT_CORNER_RADIUS] as number) ?? 0;
    }
  }
  node.cornerRadius(cornerRadius);

  applyShapeFillStroke(node, props, block, resolveBlock);
}

export function updatePolygonNode(
  node: Konva.RegularPolygon,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const radius = Math.min(width, height) / 2;
  node.radius(radius);

  let sides = 5;
  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      sides = (shapeBlock.properties[SHAPE_POLYGON_SIDES] as number) ?? 5;
    }
  }
  node.sides(sides);
  node.offsetX(0);
  node.offsetY(0);

  applyShapeFillStroke(node, props, block, resolveBlock);
}

export function updateStarNode(
  node: Konva.Star,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const outerRadius = Math.min(width, height) / 2;
  let numPoints = 5;
  let innerDiameter = 0.5;

  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      numPoints = (shapeBlock.properties[SHAPE_STAR_POINTS] as number) ?? 5;
      innerDiameter = (shapeBlock.properties[SHAPE_STAR_INNER_DIAMETER] as number) ?? 0.5;
    }
  }

  node.numPoints(numPoints);
  node.outerRadius(outerRadius);
  node.innerRadius(outerRadius * innerDiameter);

  applyShapeFillStroke(node, props, block, resolveBlock);
}

export function updateArrowNode(
  node: Konva.Arrow,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  node.points([0, height / 2, width, height / 2]);
  node.setAttr("blockWidth", width);
  node.setAttr("blockHeight", height);
  node.getSelfRect = () => ({ x: 0, y: 0, width, height });

  let pointerLength = 10;
  let pointerWidth = 10;

  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      pointerLength = (shapeBlock.properties[SHAPE_LINE_POINTER_LENGTH] as number) ?? 10;
      pointerWidth = (shapeBlock.properties[SHAPE_LINE_POINTER_WIDTH] as number) ?? 10;
    }
  }

  node.pointerLength(pointerLength);
  node.pointerWidth(pointerWidth);
  node.hitStrokeWidth(12);

  applyShapeFillStroke(node, props, block, resolveBlock);
}
