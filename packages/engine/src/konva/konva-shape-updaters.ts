import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import {
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_POLYGON_SIDES,
  SHAPE_RECT_CORNER_RADIUS,
  SHAPE_STAR_INNER_DIAMETER,
  SHAPE_STAR_POINTS,
} from "../block/property-keys";
import { applyShapeFillStroke } from "./konva-fill";

// ── Stretched polygon/star vertex helpers ──────────────────────────

/** Compute regular polygon vertices stretched to fill width × height, centered at origin. */
function computePolygonPoints(sides: number, width: number, height: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    points.push(Math.cos(angle) * (width / 2), Math.sin(angle) * (height / 2));
  }
  return points;
}

/** Compute star vertices stretched to fill width × height, centered at origin. */
function computeStarPoints(
  numPoints: number,
  innerDiameter: number,
  width: number,
  height: number,
): number[] {
  const points: number[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (Math.PI * i) / numPoints - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : innerDiameter;
    points.push(Math.cos(angle) * r * (width / 2), Math.sin(angle) * r * (height / 2));
  }
  return points;
}

function createPolySceneFunc(points: number[]) {
  return (ctx: any, shape: any) => {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.closePath();
    ctx.fillStrokeShape(shape);
  };
}

function createPolyHitFunc(points: number[]) {
  return (ctx: any, shape: any) => {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.closePath();
    ctx.fillStrokeShape(shape);
  };
}

/** Returns a getSelfRect function that reads blockWidth/blockHeight from attrs dynamically. */
function dynamicCenterSelfRect(node: Konva.Shape) {
  return () => {
    const w = (node.getAttr("blockWidth") as number) ?? 100;
    const h = (node.getAttr("blockHeight") as number) ?? 100;
    return { x: -w / 2, y: -h / 2, width: w, height: h };
  };
}

/** Bounding box for a top-left-anchored node (rect, arrow). */
function topLeftBox(width: number, height: number) {
  return { x: 0, y: 0, width, height };
}

/** Bounding box for an origin-centered node (ellipse, polygon, star). */
function centeredBox(width: number, height: number) {
  return { x: -width / 2, y: -height / 2, width, height };
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
  node.setAttr("blockWidth", width);
  node.setAttr("blockHeight", height);
  applyShapeFillStroke(node, props, centeredBox(width, height), block, resolveBlock);
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

  applyShapeFillStroke(node, props, topLeftBox(width, height), block, resolveBlock);
}

export function updatePolygonNode(
  node: Konva.RegularPolygon,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  let sides = 5;
  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      sides = (shapeBlock.properties[SHAPE_POLYGON_SIDES] as number) ?? 5;
    }
  }

  // Set block dimensions and getSelfRect BEFORE radius/sides — changing radius triggers
  // the Transformer's onChange which reads getSelfRect, so it must already be current.
  node.setAttr("blockWidth", width);
  node.setAttr("blockHeight", height);
  node.getSelfRect = dynamicCenterSelfRect(node);

  node.radius(Math.max(width, height) / 2);
  node.sides(sides);
  node.offsetX(0);
  node.offsetY(0);

  const points = computePolygonPoints(sides, width, height);
  node.sceneFunc(createPolySceneFunc(points));
  node.hitFunc(createPolyHitFunc(points));

  applyShapeFillStroke(node, props, centeredBox(width, height), block, resolveBlock);
}

export function updateStarNode(
  node: Konva.Star,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  let numPoints = 5;
  let innerDiameter = 0.5;

  if (block?.shapeId != null && resolveBlock) {
    const shapeBlock = resolveBlock(block.shapeId);
    if (shapeBlock) {
      numPoints = (shapeBlock.properties[SHAPE_STAR_POINTS] as number) ?? 5;
      innerDiameter = (shapeBlock.properties[SHAPE_STAR_INNER_DIAMETER] as number) ?? 0.5;
    }
  }

  // Set block dimensions and getSelfRect BEFORE radius — changing radius triggers
  // the Transformer's onChange which reads getSelfRect, so it must already be current.
  node.setAttr("blockWidth", width);
  node.setAttr("blockHeight", height);
  node.getSelfRect = dynamicCenterSelfRect(node);

  node.numPoints(numPoints);
  node.outerRadius(Math.max(width, height) / 2);
  node.innerRadius(node.outerRadius() * innerDiameter);

  const points = computeStarPoints(numPoints, innerDiameter, width, height);
  node.sceneFunc(createPolySceneFunc(points));
  node.hitFunc(createPolyHitFunc(points));

  applyShapeFillStroke(node, props, centeredBox(width, height), block, resolveBlock);
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

  applyShapeFillStroke(node, props, topLeftBox(width, height), block, resolveBlock);
}
