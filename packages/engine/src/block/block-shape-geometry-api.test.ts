import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";
import { SHAPE_POLYGON_SIDES, SHAPE_RECT_CORNER_RADIUS } from "./property-keys";

describe("BlockShapeAPI.setShapeGeometry", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let pageId: number;
  let graphicId: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    pageId = block.create("page");
    graphicId = block.addShape(pageId, "rect", "color", 12, 18, 140, 90);
    block.setName(graphicId, "Badge");
    block.setOpacity(graphicId, 0.4);
    engine.clearHistory();
  });

  it("replaces only geometry and restores the old shape in one undo step", () => {
    const oldShapeId = block.getShape(graphicId) as number;

    block.setShapeGeometry(graphicId, { type: "polygon", sides: 7 });

    const newShapeId = block.getShape(graphicId) as number;
    expect(newShapeId).not.toBe(oldShapeId);
    expect(block.exists(oldShapeId)).toBe(false);
    expect(block.getType(newShapeId)).toBe("shape");
    expect(block.getKind(graphicId)).toBe("polygon");
    expect(block.getFloat(newShapeId, SHAPE_POLYGON_SIDES)).toBe(7);
    expect(block.getName(graphicId)).toBe("Badge");
    expect(block.getOpacity(graphicId)).toBe(0.4);
    expect(block.getPosition(graphicId)).toEqual({ x: 12, y: 18 });

    engine.undo();
    expect(block.getShape(graphicId)).toBe(oldShapeId);
    expect(block.exists(oldShapeId)).toBe(true);
    expect(block.exists(newShapeId)).toBe(false);

    engine.redo();
    expect(block.getShape(graphicId)).toBe(newShapeId);
    expect(block.exists(oldShapeId)).toBe(false);
  });

  it("preserves a selected graphic and its styling inside an entered group", () => {
    const groupId = block.create("group");
    const siblingId = block.addShape(groupId, "ellipse", "color", 1, 2, 30, 40);
    block.appendChild(pageId, groupId);
    block.appendChild(groupId, graphicId);
    block.setSize(graphicId, 210, 120);
    block.setRotation(graphicId, 27);
    block.setFillSolidColor(graphicId, { r: 0.1, g: 0.2, b: 0.3, a: 0.8 });
    block.setStrokeEnabled(graphicId, true);
    block.setStrokeColor(graphicId, { r: 0.4, g: 0.5, b: 0.6, a: 1 });
    block.setStrokeWidth(graphicId, 6);
    block.setShadowEnabled(graphicId, true);
    block.setShadowColor(graphicId, { r: 0.7, g: 0.2, b: 0.1, a: 0.9 });
    block.setShadowOffsetX(graphicId, 9);
    block.setShadowOffsetY(graphicId, 11);
    block.setShadowBlur(graphicId, 13);
    const effectId = block.createEffect("adjustments");
    block.appendEffect(graphicId, effectId);
    block.setAdjustmentValue(effectId, "brightness", 0.25);
    block.enterGroup(groupId);
    block.select(graphicId);

    const oldShapeId = block.getShape(graphicId) as number;
    const fillId = block.getFill(graphicId);
    const children = block.getChildren(groupId);
    engine.clearHistory();

    block.setShapeGeometry(graphicId, { type: "star", points: 8, innerDiameter: 0.35 });

    const newShapeId = block.getShape(graphicId) as number;
    expect(newShapeId).not.toBe(oldShapeId);
    expect(block.getParent(graphicId)).toBe(groupId);
    expect(block.getChildren(groupId)).toEqual(children);
    expect(block.getChildren(groupId)).toEqual([siblingId, graphicId]);
    expect(block.getPosition(graphicId)).toEqual({ x: 12, y: 18 });
    expect(block.getSize(graphicId)).toEqual({ width: 210, height: 120 });
    expect(block.getRotation(graphicId)).toBe(27);
    expect(block.getFill(graphicId)).toBe(fillId);
    expect(block.getFillSolidColor(graphicId)).toEqual({ r: 0.1, g: 0.2, b: 0.3, a: 0.8 });
    expect(block.getStrokeColor(graphicId)).toEqual({ r: 0.4, g: 0.5, b: 0.6, a: 1 });
    expect(block.getStrokeWidth(graphicId)).toBe(6);
    expect(block.getShadowColor(graphicId)).toEqual({ r: 0.7, g: 0.2, b: 0.1, a: 0.9 });
    expect(block.getShadowOffsetX(graphicId)).toBe(9);
    expect(block.getShadowOffsetY(graphicId)).toBe(11);
    expect(block.getShadowBlur(graphicId)).toBe(13);
    expect(block.getOpacity(graphicId)).toBe(0.4);
    expect(block.getEffects(graphicId)).toEqual([effectId]);
    expect(block.getAdjustmentValue(effectId, "brightness")).toBe(0.25);
    expect(block.findAllSelected()).toEqual([graphicId]);
    expect(block.getGroupContext()).toEqual([groupId]);

    engine.undo();
    expect(block.getShape(graphicId)).toBe(oldShapeId);
    expect(block.getChildren(groupId)).toEqual(children);
    expect(block.findAllSelected()).toEqual([graphicId]);
    expect(block.getGroupContext()).toEqual([groupId]);

    engine.redo();
    expect(block.getShape(graphicId)).toBe(newShapeId);
    expect(block.getChildren(groupId)).toEqual(children);
    expect(block.findAllSelected()).toEqual([graphicId]);
    expect(block.getGroupContext()).toEqual([groupId]);
  });

  it("resets omitted same-kind options to fresh defaults", () => {
    block.setShapeGeometry(graphicId, { type: "rect", cornerRadius: 24 });
    block.setShapeGeometry(graphicId, { type: "rect" });
    expect(block.getFloat(block.getShape(graphicId) as number, SHAPE_RECT_CORNER_RADIUS)).toBe(0);
  });

  it("stores path names through history and keeps public naming undoable", () => {
    block.setShapeGeometry(graphicId, {
      type: "path",
      name: "heart",
      pathData: "M0 0 L10 10 Z",
      viewBox: { width: 10, height: 10 },
    });
    const pathShapeId = block.getShape(graphicId) as number;
    expect(block.getName(pathShapeId)).toBe("heart");

    engine.undo();
    expect(block.exists(pathShapeId)).toBe(false);
    engine.redo();
    expect(block.getName(pathShapeId)).toBe("heart");

    engine.clearHistory();
    block.setName(graphicId, "Renamed");
    engine.undo();
    expect(block.getName(graphicId)).toBe("Badge");
  });

  it("validates before mutation and no-ops unsupported or missing blocks", () => {
    const oldShapeId = block.getShape(graphicId);
    expect(() => block.setShapeGeometry(graphicId, { type: "polygon", sides: 2 })).toThrow();
    expect(() => block.setShapeGeometry(graphicId, { type: "triangle" } as never)).toThrow(
      "Unsupported shape geometry",
    );
    expect(block.getShape(graphicId)).toBe(oldShapeId);

    const groupId = block.create("group");
    block.setShapeGeometry(groupId, { type: "ellipse" });
    block.setShapeGeometry(999_999, { type: "ellipse" });
    expect(block.getShape(groupId)).toBeNull();
  });
});
