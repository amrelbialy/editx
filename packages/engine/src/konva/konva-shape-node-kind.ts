import Konva from "konva";
import type { BlockData } from "../block/block.types";

export function resolveShapeKind(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): string {
  if (block.type === "graphic" && block.shapeId != null && resolveBlock) {
    return resolveBlock(block.shapeId)?.kind || block.kind || "rect";
  }
  return block.kind || "rect";
}

export function isShapeNodeCompatible(
  node: Konva.Node,
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): boolean {
  if (block.type !== "graphic") return true;
  const kind = resolveShapeKind(block, resolveBlock);
  if (kind === "ellipse") return node instanceof Konva.Ellipse;
  if (kind === "polygon") return node instanceof Konva.RegularPolygon;
  if (kind === "star") return node instanceof Konva.Star;
  if (kind === "line") return node instanceof Konva.Arrow;
  if (kind === "path") return node instanceof Konva.Path;
  return node instanceof Konva.Rect;
}
