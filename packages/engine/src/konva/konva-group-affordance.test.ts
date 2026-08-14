import Konva from "konva";
import { describe, expect, it } from "vitest";
import { applyGroupContext, createGroupOutline } from "./konva-group-affordance";

describe("applyGroupContext", () => {
  it("preserves block opacity while scoping dragging to the active group", () => {
    const contentLayer = new Konva.Group();
    const activeGroup = new Konva.Group({ opacity: 0.8 });
    const child = new Konva.Rect({ width: 20, height: 20, opacity: 0.6 });
    const outsideBlock = new Konva.Rect({ width: 20, height: 20, opacity: 0.4 });
    const outline = createGroupOutline();

    contentLayer.add(activeGroup, outsideBlock);
    activeGroup.add(child);

    applyGroupContext({
      stack: [1],
      nodeMap: new Map([
        [1, activeGroup],
        [2, child],
        [3, outsideBlock],
      ]),
      contentLayer,
      outline,
    });

    expect(activeGroup.opacity()).toBe(0.8);
    expect(child.opacity()).toBe(0.6);
    expect(outsideBlock.opacity()).toBe(0.4);
    expect(activeGroup.draggable()).toBe(false);
    expect(child.draggable()).toBe(true);
    expect(outsideBlock.draggable()).toBe(false);
    expect(outline.visible()).toBe(true);
  });
});
