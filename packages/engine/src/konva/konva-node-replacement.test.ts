import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import type { KonvaNodeFactory } from "./konva-node-factory";
import { replaceIncompatibleNode } from "./konva-node-replacement";

describe("replaceIncompatibleNode", () => {
  it("retains block mapping, parent order, selection, and binds the replacement", () => {
    const parent = new Konva.Group();
    const sibling = new Konva.Rect();
    const oldNode = new Konva.Rect({ name: "block-7" });
    const destroy = vi.spyOn(oldNode, "destroy");
    parent.add(sibling, oldNode);
    const replacement = new Konva.Ellipse();
    const nodeMap = new Map<number, Konva.Node>([[7, oldNode]]);
    const transformerNodes = vi.fn(() => [oldNode]);
    const transformer = { nodes: transformerNodes } as unknown as Konva.Transformer;
    const factory = {
      createNode: vi.fn(() => replacement),
    } as unknown as KonvaNodeFactory;
    const bindHover = vi.fn();

    const result = replaceIncompatibleNode({
      id: 7,
      block: { type: "graphic", kind: "ellipse" } as BlockData,
      node: oldNode,
      nodeMap,
      factory,
      callbacks: { onDragEnd: vi.fn(), onTransformEnd: vi.fn() },
      transformer,
      contentLayer: { add: vi.fn() } as unknown as Konva.Layer,
      bindHover,
    });

    expect(result).toBe(replacement);
    expect(nodeMap.get(7)).toBe(replacement);
    expect(replacement.getParent()).toBe(parent);
    expect(replacement.zIndex()).toBe(1);
    expect(transformerNodes).toHaveBeenLastCalledWith([replacement]);
    expect(bindHover).toHaveBeenCalledWith(replacement);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
