// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SHAPE_RECT_CORNER_RADIUS } from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import { createEngine, type KonvaRendererAdapter } from "./index";

describe("konva shape transform-end geometry scaling", () => {
  let container: HTMLElement;
  let engine: EditxEngine;
  let adapter: KonvaRendererAdapter;
  let id: number;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    engine = await createEngine({ container });
    adapter = engine.getRenderer() as KonvaRendererAdapter;
    id = engine.block.create("graphic");
    engine.block.setSize(id, 100, 50);
    engine.block.setShapeGeometry(id, { type: "rect", cornerRadius: 10 });
    engine.block.setStrokeWidth(id, 4);
    engine.clearHistory();
  });

  afterEach(() => {
    engine.getRenderer()?.dispose?.();
    container.remove();
  });

  it("scales stroke and corner radius on a corner resize as one undo entry", () => {
    adapter.onBlockTransformEnd?.(
      id,
      { x: 12, y: 14, width: 400, height: 50, rotation: 15 },
      "bottom-right",
    );

    const shapeId = engine.block.getShape(id) as number;
    expect(engine.block.getStrokeWidth(id)).toBe(8);
    expect(engine.block.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS)).toBe(20);
    expect(engine.block.getSize(id)).toEqual({ width: 400, height: 50 });

    engine.undo();
    expect(engine.canUndo()).toBe(false);
    expect(engine.block.getStrokeWidth(id)).toBe(4);
    expect(
      engine.block.getFloat(engine.block.getShape(id) as number, SHAPE_RECT_CORNER_RADIUS),
    ).toBe(10);
    expect(engine.block.getSize(id)).toEqual({ width: 100, height: 50 });
  });

  it.each([
    ["width", "middle-right", 400, 50],
    ["height", "bottom-center", 100, 200],
  ])("scales stroke and corner radius on a %s-only resize", (_axis, anchor, width, height) => {
    adapter.onBlockTransformEnd?.(id, { x: 0, y: 0, width, height, rotation: 0 }, anchor);

    expect(engine.block.getStrokeWidth(id)).toBe(8);
    expect(
      engine.block.getFloat(engine.block.getShape(id) as number, SHAPE_RECT_CORNER_RADIUS),
    ).toBe(20);
    expect(engine.block.getSize(id)).toEqual({ width, height });
  });
});
