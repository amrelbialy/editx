import { describe, expect, it, vi } from "vitest";
import { createGroupNode } from "./konva-group-node";

describe("createGroupNode", () => {
  it("reports temporary scale before resetting the rendered group", () => {
    const onTransformEnd = vi.fn();
    const group = createGroupNode(7, { onDragEnd: vi.fn(), onTransformEnd });
    group.setAttrs({ x: 12, y: 14, rotation: 30, scaleX: 2, scaleY: 2 });

    group.fire("transformend");

    expect(group.scale()).toEqual({ x: 1, y: 1 });
    expect(onTransformEnd).toHaveBeenCalledWith(7, {
      x: 12,
      y: 14,
      width: 0,
      height: 0,
      rotation: 30,
      scaleX: 2,
      scaleY: 2,
    });
  });
});
