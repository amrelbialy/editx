import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import { isCenterOriginNode } from "./konva-node-handlers";

export function setBlockCropProxyFrame(
  proxy: Konva.Rect,
  node: Konva.Shape,
  frame: CropRect,
): void {
  const centerOrigin = isCenterOriginNode(node);
  const width = Math.max(proxy.width(), 1);
  const height = Math.max(proxy.height(), 1);
  proxy.setAttrs({
    x: centerOrigin ? frame.x + frame.width / 2 : frame.x,
    y: centerOrigin ? frame.y + frame.height / 2 : frame.y,
    scaleX: (Math.sign(proxy.scaleX()) || 1) * (frame.width / width),
    scaleY: (Math.sign(proxy.scaleY()) || 1) * (frame.height / height),
  });
}

export function getBlockCropProxyFrame(proxy: Konva.Rect, node: Konva.Shape): CropRect {
  const width = Math.abs(proxy.width() * proxy.scaleX());
  const height = Math.abs(proxy.height() * proxy.scaleY());
  const centerOrigin = isCenterOriginNode(node);
  return {
    x: centerOrigin ? proxy.x() - width / 2 : proxy.x(),
    y: centerOrigin ? proxy.y() - height / 2 : proxy.y(),
    width,
    height,
  };
}
