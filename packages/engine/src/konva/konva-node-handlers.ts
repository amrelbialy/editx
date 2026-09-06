import Konva from "konva";
import type { BlockData } from "../block/block.types";
import type { NodeCallbacks } from "./konva-node-factory";

/** Center-origin shapes store their top-left in the engine but render centered in Konva. */
export function isCenterOriginNode(node: Konva.Node): boolean {
  return (
    node instanceof Konva.RegularPolygon ||
    node instanceof Konva.Star ||
    node instanceof Konva.Ellipse
  );
}

const PILL_ANCHORS = new Set(["middle-left", "middle-right", "top-center", "bottom-center"]);

/**
 * Wires drag/transform handlers on a freshly created shape node. Keeps
 * {@link KonvaNodeFactory.createNode} focused on node construction.
 */
export function attachNodeHandlers(
  node: Konva.Shape,
  id: number,
  block: BlockData,
  callbacks: NodeCallbacks,
): void {
  node.on("dragend", () => {
    const pos = node.position();
    if (isCenterOriginNode(node)) {
      const w = node.getAttr("blockWidth") ?? 100;
      const h = node.getAttr("blockHeight") ?? 100;
      callbacks.onDragEnd(id, pos.x - w / 2, pos.y - h / 2);
    } else {
      callbacks.onDragEnd(id, pos.x, pos.y);
    }
  });

  // For text nodes on pill (edge) anchors, reset scale and apply width/height
  // live so the text reflows instead of visually stretching. Corner anchors
  // still scale normally (font sizes are adjusted on transformend).
  if (block.type === "text") {
    node.on("transform", () => {
      const anchor = callbacks.getActiveAnchor?.() ?? "";
      if (!PILL_ANCHORS.has(anchor)) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      if (scaleX !== 1 || scaleY !== 1) {
        node.width(node.width() * scaleX);
        node.height(node.height() * scaleY);
        node.scaleX(1);
        node.scaleY(1);
      }
    });
  }

  node.on("transformend", () => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const baseW = node.getAttr("blockWidth") ?? node.width();
    const baseH = node.getAttr("blockHeight") ?? node.height();
    const newW = baseW * scaleX;
    const newH = baseH * scaleY;
    const center = isCenterOriginNode(node);
    const result = {
      x: center ? node.x() - newW / 2 : node.x(),
      y: center ? node.y() - newH / 2 : node.y(),
      width: newW,
      height: newH,
      rotation: node.rotation(),
    };
    node.scaleX(1);
    node.scaleY(1);
    callbacks.onTransformEnd(id, result);
  });
}
