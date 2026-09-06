import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { BlockAPI } from "./block/block-api";
import {
  SHAPE_PATH_DATA,
  SHAPE_PATH_VIEWBOX_HEIGHT,
  SHAPE_PATH_VIEWBOX_WIDTH,
  TEXT_CURVE_RADIUS,
} from "./block/property-keys";
import { EditxEngine } from "./editx-engine";
import { SceneAPI } from "./scene";

/** Spin up a fresh engine/block/scene trio (for loading into a clean store). */
function freshScene(): { block: BlockAPI; scene: SceneAPI } {
  const engine = new EditxEngine({ renderer: createMockRenderer() });
  const block = new BlockAPI(engine);
  const scene = new SceneAPI(engine, block);
  return { block, scene };
}

describe("SceneAPI — serialization v2", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let scene: SceneAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
    block = new BlockAPI(engine);
    scene = new SceneAPI(engine, block);
  });

  it("saveToString emits version: 2", async () => {
    await scene.create();
    const payload = JSON.parse(scene.saveToString()) as { version: number };
    expect(payload.version).toBe(2);
  });

  it("still throws on an unsupported version (3)", async () => {
    const bad = JSON.stringify({ version: 3, blocks: [] });
    await expect(scene.loadFromString(bad)).rejects.toThrow("Unsupported scene version");
  });

  it("still throws on an unsupported version (0)", async () => {
    const bad = JSON.stringify({ version: 0, blocks: [] });
    await expect(scene.loadFromString(bad)).rejects.toThrow("Unsupported scene version");
  });

  describe("v1 back-compat — absent new keys fall back to defaults", () => {
    it("loads a v1 payload without throwing and reads zero-value defaults", async () => {
      // Build a scene, serialize it, then downgrade the payload to version 1 to
      // simulate a pre-feature document that lacks the new fill/shape/text keys.
      await scene.create();
      const pageId = scene.getCurrentPage()!;

      const txt = block.create("text");
      block.appendChild(pageId, txt);
      block.setString(txt, "text/content", "Hello");

      block.addShape(pageId, "rect", "color", 0, 0, 100, 100);

      const v2 = JSON.parse(scene.saveToString());
      v2.version = 1; // downgrade to a v1 document
      const v1Json = JSON.stringify(v2);

      const { block: block2, scene: scene2 } = freshScene();
      await expect(scene2.loadFromString(v1Json)).resolves.toBeUndefined();

      const pageId2 = scene2.getCurrentPage()!;
      const children = block2.getChildren(pageId2);
      const txt2 = children.find((id) => block2.getType(id) === "text")!;
      const gfx2 = children.find((id) => block2.getShape(id) != null)!;

      // Text curve radius falls back to 0 (flat); getTextCurve resolves null.
      expect(block2.getFloat(txt2, TEXT_CURVE_RADIUS)).toBe(0);
      expect(block2.getTextCurve(txt2)).toBeNull();

      // Shape path data falls back to "" on the shape sub-block.
      const shapeId2 = block2.getShape(gfx2)!;
      expect(block2.getString(shapeId2, SHAPE_PATH_DATA)).toBe("");

      // A color-fill block's gradient/image getters gate on fill kind → null.
      expect(block2.getFillGradient(gfx2)).toBeNull();
      expect(block2.getFillImage(gfx2)).toBeNull();
    });
  });

  describe("gradient / image fill save → load round-trip", () => {
    it("round-trips a gradient fill (stops / angle / type)", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const gfx = block.addShape(pageId, "rect", "color", 0, 0, 100, 100);
      block.changeFillKind(gfx, "gradient");
      block.setFillGradient(gfx, {
        type: "linear",
        angle: 45,
        stops: [
          { offset: 0, color: "#ff0000" },
          { offset: 0.5, color: "rgba(0,255,0,0.5)" },
          { offset: 1, color: "#0000ff" },
        ],
      });
      const original = block.getFillGradient(gfx);

      const json = scene.saveToString();
      const { block: block2, scene: scene2 } = freshScene();
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const gfx2 = block2.getChildren(pageId2)[0];
      expect(block2.getFillGradient(gfx2)).toEqual(original);
    });

    it("round-trips an image fill and its content transform", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const gfx = block.addShape(pageId, "rect", "color", 0, 0, 100, 100);
      block.changeFillKind(gfx, "image");
      block.setFillImage(gfx, {
        src: "data:image/png;base64,AAAA",
        mode: "fit",
        offsetX: 12,
        offsetY: -8,
        scale: 1.5,
        rotation: 270,
        flipHorizontal: true,
        flipVertical: true,
      });
      const original = block.getFillImage(gfx);

      const json = scene.saveToString();
      const { block: block2, scene: scene2 } = freshScene();
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const gfx2 = block2.getChildren(pageId2)[0];
      expect(block2.getFillImage(gfx2)).toEqual(original);
    });
  });

  it("round-trips a scene with path shape, curved text, group, and gradient fill", async () => {
    await scene.create();
    const pageId = scene.getCurrentPage()!;

    // Path shape (data + viewBox).
    const pathGfx = block.addShape(pageId, "path", "color", 0, 0, 200, 200, {
      pathData: "M0 0 L10 10 Z",
      viewBox: { width: 24, height: 24 },
    });

    // Curved text block.
    const txt = block.create("text");
    block.appendChild(pageId, txt);
    block.setString(txt, "text/content", "Curved");
    block.setTextCurve(txt, 120, "down");

    // Group of two graphics.
    const a = block.create("graphic");
    const b = block.create("graphic");
    block.appendChild(pageId, a);
    block.appendChild(pageId, b);
    block.group([a, b]);

    // Gradient fill on the path shape's graphic.
    block.changeFillKind(pathGfx, "gradient");
    block.setFillGradient(pathGfx, {
      type: "radial",
      angle: 0,
      stops: [
        { offset: 0, color: "#000000" },
        { offset: 1, color: "#ffffff" },
      ],
    });
    const gradient = block.getFillGradient(pathGfx);

    const json = scene.saveToString();
    const { block: block2, scene: scene2 } = freshScene();
    await scene2.loadFromString(json);

    const pageId2 = scene2.getCurrentPage()!;
    const children = block2.getChildren(pageId2);

    // Path shape survives.
    const pathGfx2 = children.find((id) => block2.getShape(id) != null)!;
    const shapeId2 = block2.getShape(pathGfx2)!;
    expect(block2.getString(shapeId2, SHAPE_PATH_DATA)).toBe("M0 0 L10 10 Z");
    expect(block2.getFloat(shapeId2, SHAPE_PATH_VIEWBOX_WIDTH)).toBe(24);
    expect(block2.getFloat(shapeId2, SHAPE_PATH_VIEWBOX_HEIGHT)).toBe(24);

    // Curved text survives.
    const txt2 = children.find((id) => block2.getType(id) === "text")!;
    expect(block2.getTextCurve(txt2)).toEqual({ radius: 120, direction: "down" });

    // Group survives with its two children.
    const groupId2 = children.find((id) => block2.getType(id) === "group")!;
    expect(groupId2).toBeDefined();
    expect(block2.getChildren(groupId2)).toHaveLength(2);

    // Gradient fill survives (stops preserved).
    expect(block2.getFillGradient(pathGfx2)).toEqual(gradient);
  });
});
