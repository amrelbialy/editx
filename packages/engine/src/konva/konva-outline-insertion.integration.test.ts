import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { EditxEngine } from "../editx-engine";
import type { RendererAdapter } from "../render-adapter";
import { KonvaNodeFactory } from "./konva-node-factory";

describe("outlined shape insertion", () => {
  it("renders a transparent interior and removes the insertion with one undo", () => {
    const nodes = new Map<number, Konva.Node>();
    const factory = new KonvaNodeFactory({} as Konva.Stage);
    let engine: EditxEngine;
    const renderer = {
      syncBlock(id: number, block: BlockData) {
        if (block.type !== "graphic") return;
        let node = nodes.get(id);
        if (!node) {
          node = factory.createNode(
            id,
            block,
            { onDragEnd: vi.fn(), onTransformEnd: vi.fn() },
            (blockId) => engine._getBlockStore().get(blockId),
          )!;
          nodes.set(id, node);
        }
        factory.updateNode(node, block, (blockId) => engine._getBlockStore().get(blockId));
      },
      removeBlock(id: number) {
        nodes.get(id)?.destroy();
        nodes.delete(id);
      },
      renderFrame: vi.fn(),
    } as unknown as RendererAdapter;
    engine = new EditxEngine({ renderer });
    const pageId = engine.block.create("page");
    engine.clearHistory();

    engine.beginBatch();
    const graphicId = engine.block.addShape(pageId, "rect", "color", 100, 75, 200, 150);
    engine.block.setFillSolidColor(graphicId, { r: 0, g: 0, b: 0, a: 0 });
    engine.block.setFillEnabled(graphicId, false);
    engine.block.setStrokeEnabled(graphicId, true);
    engine.block.setStrokeColor(graphicId, { r: 0.23, g: 0.51, b: 0.96, a: 1 });
    engine.block.setStrokeWidth(graphicId, 6);
    engine.block.setShapeGeometry(graphicId, { type: "rect", cornerRadius: 8 });
    engine.endBatch();

    const renderedNode = nodes.get(graphicId) as Konva.Shape;
    expect(engine.block.isFillEnabled(graphicId)).toBe(false);
    expect(renderedNode.fill()).toBe("");
    expect(renderedNode.stroke()).toBe("#3b82f5");
    expect(renderedNode.strokeWidth()).toBe(6);

    engine.undo();
    expect(engine.block.exists(graphicId)).toBe(false);
    expect(nodes.has(graphicId)).toBe(false);
  });
});
