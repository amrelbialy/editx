import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { BlockAPI } from "./block/block-api";
import { CreativeEngine } from "./creative-engine";
import type { RendererAdapter } from "./render-adapter";
import { SceneAPI } from "./scene";

describe("SceneAPI", () => {
  let engine: CreativeEngine;
  let block: BlockAPI;
  let scene: SceneAPI;
  let renderer: RendererAdapter;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new CreativeEngine({ renderer });
    block = new BlockAPI(engine);
    scene = new SceneAPI(engine, block);
  });

  describe("create", () => {
    it("creates a scene and a page", async () => {
      await scene.create();

      expect(scene.getScene()).not.toBeNull();
      expect(scene.getCurrentPage()).not.toBeNull();
    });

    it("uses default dimensions (1080x1080)", async () => {
      await scene.create();

      const sceneId = scene.getScene()!;
      expect(block.getFloat(sceneId, "scene/width")).toBe(1080);
      expect(block.getFloat(sceneId, "scene/height")).toBe(1080);
    });

    it("uses custom dimensions", async () => {
      await scene.create({ width: 800, height: 600 });

      const sceneId = scene.getScene()!;
      expect(block.getFloat(sceneId, "scene/width")).toBe(800);
      expect(block.getFloat(sceneId, "scene/height")).toBe(600);

      const pageId = scene.getCurrentPage()!;
      expect(block.getFloat(pageId, "page/width")).toBe(800);
      expect(block.getFloat(pageId, "page/height")).toBe(600);
    });

    it("calls renderer.createScene", async () => {
      await scene.create();
      expect(renderer.createScene).toHaveBeenCalled();
    });

    it("clears history after create (scene creation is not undoable)", async () => {
      await scene.create();
      expect(engine.canUndo()).toBe(false);
    });

    it("page is child of scene", async () => {
      await scene.create();
      const sceneId = scene.getScene()!;
      const pageId = scene.getCurrentPage()!;
      expect(block.getChildren(sceneId)).toContain(pageId);
      expect(block.getParent(pageId)).toBe(sceneId);
    });
  });

  describe("getScene / getCurrentPage", () => {
    it("returns null before create", () => {
      expect(scene.getScene()).toBeNull();
      expect(scene.getCurrentPage()).toBeNull();
    });
  });

  describe("getPages", () => {
    it("returns empty array before create", () => {
      expect(scene.getPages()).toEqual([]);
    });

    it("returns the initial page after create", async () => {
      await scene.create();
      const pages = scene.getPages();
      expect(pages).toHaveLength(1);
      expect(pages[0]).toBe(scene.getCurrentPage());
    });
  });

  describe("addPage", () => {
    it("adds a new page to the scene", async () => {
      await scene.create();
      const newPageId = scene.addPage();
      const pages = scene.getPages();
      expect(pages).toHaveLength(2);
      expect(pages).toContain(newPageId);
    });

    it("uses scene dimensions by default", async () => {
      await scene.create({ width: 500, height: 400 });
      const newPageId = scene.addPage();
      expect(block.getFloat(newPageId, "page/width")).toBe(500);
      expect(block.getFloat(newPageId, "page/height")).toBe(400);
    });

    it("uses custom dimensions when provided", async () => {
      await scene.create();
      const newPageId = scene.addPage({ width: 200, height: 150 });
      expect(block.getFloat(newPageId, "page/width")).toBe(200);
      expect(block.getFloat(newPageId, "page/height")).toBe(150);
    });

    it("throws if no active scene", () => {
      expect(() => scene.addPage()).toThrow("No active scene");
    });
  });

  describe("setActivePage", () => {
    it("changes the active page", async () => {
      await scene.create();
      const newPageId = scene.addPage();
      scene.setActivePage(newPageId);
      expect(scene.getCurrentPage()).toBe(newPageId);
    });
  });

  describe("saveToString / loadFromString", () => {
    it("round-trips a basic scene", async () => {
      await scene.create({ width: 800, height: 600 });
      const json = scene.saveToString();

      // Create a fresh engine and load
      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const sceneId = scene2.getScene()!;
      expect(sceneId).not.toBeNull();
      expect(block2.getFloat(sceneId, "scene/width")).toBe(800);
      expect(block2.getFloat(sceneId, "scene/height")).toBe(600);

      const pageId = scene2.getCurrentPage()!;
      expect(pageId).not.toBeNull();
      expect(block2.getFloat(pageId, "page/width")).toBe(800);
      expect(block2.getFloat(pageId, "page/height")).toBe(600);
    });

    it("preserves graphic blocks with properties", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const gfx = block.create("graphic");
      block.appendChild(pageId, gfx);
      block.setFloat(gfx, "transform/position/x", 42);
      block.setFloat(gfx, "transform/position/y", 99);
      block.setFloat(gfx, "transform/size/width", 200);
      block.setFloat(gfx, "transform/size/height", 150);

      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const children = block2.getChildren(pageId2);
      expect(children).toHaveLength(1);
      expect(block2.getFloat(children[0], "transform/position/x")).toBe(42);
      expect(block2.getFloat(children[0], "transform/position/y")).toBe(99);
      expect(block2.getFloat(children[0], "transform/size/width")).toBe(200);
      expect(block2.getFloat(children[0], "transform/size/height")).toBe(150);
    });

    it("preserves effects and sub-blocks", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const gfx = block.create("graphic");
      block.appendChild(pageId, gfx);

      const effectId = block.createEffect("adjustments");
      block.appendEffect(gfx, effectId);
      block.setFloat(effectId, "effect/adjustments/brightness", 0.3);

      const shapeId = block.createShape("rect");
      block.setShape(gfx, shapeId);

      const fillId = block.createFill("color");
      block.setFill(gfx, fillId);

      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const children = block2.getChildren(pageId2);
      const gfx2 = children[0];

      const effects = block2.getEffects(gfx2);
      expect(effects).toHaveLength(1);
      expect(block2.getFloat(effects[0], "effect/adjustments/brightness")).toBe(0.3);
      expect(block2.getShape(gfx2)).not.toBeNull();
      expect(block2.getFill(gfx2)).not.toBeNull();
    });

    it("preserves text blocks with runs", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const txt = block.create("text");
      block.appendChild(pageId, txt);
      block.setString(txt, "text/content", "Hello World");

      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const children = block2.getChildren(pageId2);
      expect(block2.getString(children[0], "text/content")).toBe("Hello World");
    });

    it("clears history after load", async () => {
      await scene.create();
      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      expect(engine2.canUndo()).toBe(false);
    });

    it("new blocks get fresh IDs after load", async () => {
      await scene.create();
      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const existingIds = new Set([scene2.getScene(), scene2.getCurrentPage()]);
      const newBlock = block2.create("graphic");
      expect(existingIds.has(newBlock)).toBe(false);
    });

    it("throws on unsupported version", async () => {
      const bad = JSON.stringify({ version: 99, blocks: [] });
      await expect(scene.loadFromString(bad)).rejects.toThrow("Unsupported scene version");
    });

    it("throws on invalid data", async () => {
      const bad = JSON.stringify({ version: 1 });
      await expect(scene.loadFromString(bad)).rejects.toThrow("missing blocks array");
    });

    it("overwrites existing scene on load", async () => {
      await scene.create({ width: 800, height: 600 });
      const json = scene.saveToString();

      // Modify the scene
      await scene.create({ width: 500, height: 400 });
      expect(block.getFloat(scene.getScene()!, "scene/width")).toBe(500);

      // Load overwrites
      await scene.loadFromString(json);
      expect(block.getFloat(scene.getScene()!, "scene/width")).toBe(800);
    });

    it("preserves color properties", async () => {
      await scene.create();
      const pageId = scene.getCurrentPage()!;
      const gfx = block.create("graphic");
      block.appendChild(pageId, gfx);
      block.setColor(gfx, "fill/color/value", { r: 1, g: 0, b: 0.5, a: 0.8 });

      const json = scene.saveToString();

      const engine2 = new CreativeEngine({ renderer: createMockRenderer() });
      const block2 = new BlockAPI(engine2);
      const scene2 = new SceneAPI(engine2, block2);
      await scene2.loadFromString(json);

      const pageId2 = scene2.getCurrentPage()!;
      const gfx2 = block2.getChildren(pageId2)[0];
      const color = block2.getColor(gfx2, "fill/color/value");
      expect(color).toEqual({ r: 1, g: 0, b: 0.5, a: 0.8 });
    });
  });
});
