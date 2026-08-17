// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BlockData } from "../block/block.types";
import {
  SHAPE_RECT_CORNER_RADIUS,
  TEXT_AUTO_HEIGHT,
  TEXT_AUTO_WIDTH,
  TEXT_PADDING,
} from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import { createEngine, type KonvaRendererAdapter } from "./index";

describe("konva group transform-end scaling", () => {
  let container: HTMLElement;
  let engine: EditxEngine;
  let adapter: KonvaRendererAdapter;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    engine = await createEngine({ container });
    adapter = engine.getRenderer() as KonvaRendererAdapter;
  });

  afterEach(() => {
    engine.getRenderer()?.dispose?.();
    container.remove();
  });

  it("recursively scales descendants and is one exact undo step", () => {
    const outerId = engine.block.create("group");
    engine.block.setPosition(outerId, 100, 200);

    const graphicId = engine.block.create("graphic");
    engine.block.setPosition(graphicId, 0, 0);
    engine.block.setSize(graphicId, 20, 10);
    engine.block.setShapeGeometry(graphicId, { type: "rect", cornerRadius: 2 });
    engine.block.setStrokeWidth(graphicId, 3);
    engine.block.appendChild(outerId, graphicId);

    const innerId = engine.block.create("group");
    engine.block.setPosition(innerId, 50, 10);
    engine.block.appendChild(outerId, innerId);

    const textId = engine.block.create("text");
    engine.block.setPosition(textId, 0, 0);
    engine.block.setSize(textId, 30, 20);
    engine.block.setFloat(textId, TEXT_PADDING, 3);
    engine.block.setProperty(textId, "text/runs", [
      { text: "Scale", style: { fontSize: 20, letterSpacing: 1 } },
    ]);
    engine.block.setBool(textId, TEXT_AUTO_HEIGHT, true);
    engine.block.setBool(textId, TEXT_AUTO_WIDTH, true);
    engine.block.appendChild(innerId, textId);

    engine.block.refitGroupBounds(innerId);
    engine.block.refitGroupBounds(outerId);
    const shapeId = engine.block.getShape(graphicId) as number;
    const ids = [outerId, innerId, graphicId, shapeId, textId];
    const snapshots = () => ids.map((id) => engine._getBlockStore().snapshot(id) as BlockData);
    const before = snapshots();
    engine.clearHistory();

    adapter.onBlockTransformEnd?.(
      outerId,
      { x: 80, y: 180, width: 0, height: 0, rotation: 15, scaleX: 2, scaleY: 2 },
      "bottom-right",
    );

    expect(engine.block.getPosition(outerId)).toEqual({ x: 80, y: 180 });
    expect(engine.block.getRotation(outerId)).toBe(15);
    expect(engine.block.getSize(outerId)).toEqual({ width: 160, height: 60 });
    expect(engine.block.getPosition(innerId)).toEqual({ x: 100, y: 20 });
    expect(engine.block.getSize(innerId)).toEqual({ width: 60, height: 40 });
    expect(engine.block.getSize(graphicId)).toEqual({ width: 40, height: 20 });
    expect(engine.block.getStrokeWidth(graphicId)).toBe(6);
    expect(engine.block.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS)).toBe(4);
    expect(engine.block.getSize(textId)).toEqual({ width: 60, height: 40 });
    expect(engine.block.getTextRuns(textId)[0].style).toMatchObject({
      fontSize: 40,
      letterSpacing: 2,
    });
    expect(engine.block.getFloat(textId, TEXT_PADDING)).toBe(6);
    expect(engine.block.getBool(textId, TEXT_AUTO_HEIGHT)).toBe(false);
    expect(engine.block.getBool(textId, TEXT_AUTO_WIDTH)).toBe(false);

    const after = snapshots();
    engine.undo();
    expect(snapshots()).toEqual(before);
    expect(engine.canUndo()).toBe(false);

    engine.redo();
    expect(snapshots()).toEqual(after);
  });

  it("rejects non-uniform and reflected group scales", () => {
    const groupId = engine.block.create("group");
    const childId = engine.block.create("graphic");
    engine.block.setSize(childId, 20, 10);
    engine.block.appendChild(groupId, childId);
    engine.block.refitGroupBounds(groupId);
    engine.clearHistory();

    adapter.onBlockTransformEnd?.(
      groupId,
      { x: 5, y: 6, width: 0, height: 0, rotation: 10, scaleX: 2, scaleY: 1 },
      "bottom-right",
    );

    expect(engine.block.getSize(childId)).toEqual({ width: 20, height: 10 });
    expect(engine.block.getPosition(groupId)).toEqual({ x: 5, y: 6 });
    expect(engine.block.getRotation(groupId)).toBe(10);
  });
});
