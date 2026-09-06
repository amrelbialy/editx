import type Konva from "konva";

export interface BlockScreenTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function getNodeScreenTransform(node: Konva.Node): BlockScreenTransform {
  const [a, b, c, d, e, f] = node.getAbsoluteTransform().getMatrix();
  return { a, b, c, d, e, f };
}
