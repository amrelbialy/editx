import type Konva from "konva";

/** Hit-detection width (px) around a transformer border edge. */
export const EDGE_HIT_WIDTH = 12;

/**
 * Screen-constant sizing helper: the transformer lives on the (zoom-scaled)
 * uiLayer, so multiply local sizes by 1/scale to keep handles/strokes a
 * constant on-screen pixel size regardless of world zoom.
 */
export function layerInvScale(node: Konva.Node): number {
  const s = node.getLayer()?.scaleX() || 1;
  return 1 / s;
}
