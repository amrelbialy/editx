import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import type { KonvaNodeFactory, NodeCallbacks } from "./konva-node-factory";
import { isShapeNodeCompatible } from "./konva-shape-node-kind";

interface ReplaceNodeOptions {
  id: number;
  block: BlockData;
  node: Konva.Node;
  nodeMap: Map<number, Konva.Node>;
  factory: KonvaNodeFactory;
  callbacks: NodeCallbacks;
  transformer: Konva.Transformer;
  contentLayer: Konva.Layer;
  bindHover: (node: Konva.Node) => void;
  resolveBlock?: (id: number) => BlockData | undefined;
}

export function replaceIncompatibleNode(options: ReplaceNodeOptions): Konva.Node {
  const { id, block, node, nodeMap, factory, callbacks, transformer, contentLayer, resolveBlock } =
    options;
  if (isShapeNodeCompatible(node, block, resolveBlock)) return node;

  const replacement = factory.createNode(id, block, callbacks, resolveBlock);
  if (!replacement) return node;

  const parent = node.getParent();
  const index = node.zIndex();
  const transformerNodes = transformer.nodes();
  if (parent) parent.add(replacement);
  else contentLayer.add(replacement);
  replacement.zIndex(index);
  nodeMap.set(id, replacement);
  options.bindHover(replacement);
  if (transformerNodes.includes(node)) {
    transformer.nodes(transformerNodes.map((item) => (item === node ? replacement : item)));
  }
  node.destroy();
  return replacement;
}
