import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { createGroupNode } from "./konva-group-node";
import { attachNodeHandlers } from "./konva-node-handlers";

describe("continuous wrapper transform commits", () => {
  it("reports leaf drag and resize geometry in page-local coordinates", () => {
    const wrapper = new Konva.Group({ x: 300, y: 200 });
    const node = new Konva.Rect({ x: 10, y: 15, width: 40, height: 20 });
    node.setAttrs({ blockWidth: 40, blockHeight: 20 });
    wrapper.add(node);
    const onDragEnd = vi.fn();
    const onTransformEnd = vi.fn();
    attachNodeHandlers(node, 7, { type: "graphic" } as BlockData, { onDragEnd, onTransformEnd });

    node.fire("dragend");
    expect(onDragEnd).toHaveBeenCalledWith(7, 10, 15);
    node.scale({ x: 2, y: 2 });
    node.fire("transformend");
    expect(onTransformEnd).toHaveBeenCalledWith(7, {
      x: 10,
      y: 15,
      width: 80,
      height: 40,
      rotation: 0,
    });
  });

  it("reports group transforms locally while absolute geometry includes the wrapper once", () => {
    const wrapper = new Konva.Group({ x: 300, y: 200 });
    const onDragEnd = vi.fn();
    const onTransformEnd = vi.fn();
    const group = createGroupNode(8, { onDragEnd, onTransformEnd });
    group.position({ x: 25, y: 30 });
    wrapper.add(group);

    group.fire("dragend");
    expect(onDragEnd).toHaveBeenCalledWith(8, 25, 30);
    expect(group.getAbsolutePosition()).toEqual({ x: 325, y: 230 });
  });
});
