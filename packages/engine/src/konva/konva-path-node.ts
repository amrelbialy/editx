import Konva from "konva";
import type { BlockData } from "../block/block.types";
import {
  SHAPE_PATH_DATA,
  SHAPE_PATH_PRESERVE_ASPECT,
  SHAPE_PATH_VIEWBOX_HEIGHT,
  SHAPE_PATH_VIEWBOX_WIDTH,
} from "../block/property-keys";
import { applyShapeFillStroke } from "./konva-fill";

/** Create a Konva.Path node for a "path" shape block (data filled in on update). */
export function createPathNode(id: number): Konva.Path {
  return new Konva.Path({ name: `block-${id}`, draggable: true, data: "" });
}

interface PathShapeProps {
  data: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  preserveAspect: boolean;
}

/** Read path `d`/viewBox/preserveAspect from the graphic block's shape sub-block. */
function readPathShapeProps(
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): PathShapeProps {
  let data = "";
  let viewBoxWidth = 100;
  let viewBoxHeight = 100;
  let preserveAspect = true;
  if (block?.shapeId != null && resolveBlock) {
    const shape = resolveBlock(block.shapeId);
    if (shape) {
      const p = shape.properties;
      data = (p[SHAPE_PATH_DATA] as string) ?? "";
      viewBoxWidth = (p[SHAPE_PATH_VIEWBOX_WIDTH] as number) ?? 100;
      viewBoxHeight = (p[SHAPE_PATH_VIEWBOX_HEIGHT] as number) ?? 100;
      preserveAspect = (p[SHAPE_PATH_PRESERVE_ASPECT] as boolean) ?? true;
    }
  }
  return { data, viewBoxWidth, viewBoxHeight, preserveAspect };
}

/**
 * Update a Konva.Path: set `data`, scale the viewBox onto the block's size
 * (uniform min-scale when `preserveAspect`, non-uniform otherwise), then resolve
 * fill/stroke/shadow in local viewBox coordinates via the shared fill resolver.
 *
 * Selection bounds and the transform-end math run in the path's local viewBox
 * space (top-left anchored); the node `scale` maps that space onto the block's
 * rendered size, so `blockWidth`/`blockHeight` attrs hold the viewBox extents.
 */
export function updatePathNode(
  node: Konva.Path,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const { data, viewBoxWidth, viewBoxHeight, preserveAspect } = readPathShapeProps(
    block,
    resolveBlock,
  );

  node.data(data);

  const vbW = viewBoxWidth > 0 ? viewBoxWidth : 1;
  const vbH = viewBoxHeight > 0 ? viewBoxHeight : 1;
  const rawScaleX = width / vbW;
  const rawScaleY = height / vbH;
  if (preserveAspect) {
    const uniform = Math.min(rawScaleX, rawScaleY);
    node.scale({ x: uniform, y: uniform });
  } else {
    node.scale({ x: rawScaleX, y: rawScaleY });
  }

  node.setAttr("blockWidth", vbW);
  node.setAttr("blockHeight", vbH);
  node.getSelfRect = () => ({ x: 0, y: 0, width: vbW, height: vbH });

  applyShapeFillStroke(node, props, { x: 0, y: 0, width: vbW, height: vbH }, block, resolveBlock);
}
