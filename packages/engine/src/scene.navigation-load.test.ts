import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { BlockData } from "./block/block.types";
import { EditxEngine } from "./editx-engine";

interface ScenePayload {
  version: number;
  blocks: BlockData[];
  activeSceneId: number | null;
  activePageId: number | null;
}

describe("page navigation during scene replacement", () => {
  let engine: EditxEngine;

  beforeEach(async () => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
    await engine.scene.create();
  });

  it("creates a replacement scene with one final valid page notification", async () => {
    const previousPageId = engine.getActivePage();
    const callback = vi.fn(() => {
      expect(engine.scene.getPages()).toContain(engine.getActivePage());
    });
    engine.onActivePageChanged(callback);

    await engine.scene.create();

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: engine.getActivePage(),
      previousPageId,
    });
  });

  it.each([1, 2])("loads v%i selected page without intermediate notifications", async (version) => {
    engine.scene.addPage();
    const selected = engine.scene.addPage();
    const payload: ScenePayload = JSON.parse(engine.scene.saveToString());
    payload.version = version;
    await engine.scene.create();
    const previousPageId = engine.getActivePage();
    const callback = vi.fn(() => {
      expect(engine.scene.getPages()).toContain(engine.getActivePage());
    });
    engine.scene.onActivePageChanged(callback);

    await engine.scene.loadFromString(JSON.stringify(payload));

    expect(engine.getActivePage()).toBe(selected);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: selected,
      previousPageId,
    });
    expect(engine.canUndo()).toBe(false);
  });

  it("does not notify when the loaded active page ID is unchanged", async () => {
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    await engine.scene.loadFromString(engine.scene.saveToString());
    expect(callback).not.toHaveBeenCalled();
  });

  it("chooses the first page if a loaded scene has no selected page", async () => {
    const first = engine.getActivePage();
    engine.scene.addPage();
    const previousPageId = engine.getActivePage();
    const payload: ScenePayload = JSON.parse(engine.scene.saveToString());
    payload.activePageId = null;
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    await engine.scene.loadFromString(JSON.stringify(payload));

    expect(engine.getActivePage()).toBe(first);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ pageId: first, previousPageId });
  });

  it("clears stale navigation when an empty document is loaded", async () => {
    const previousPageId = engine.getActivePage();
    const previousBlockIds = engine._getBlockStore().getAllBlockIds();
    const renderer = engine.getRenderer()!;
    vi.mocked(renderer.removeBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    const empty = new EditxEngine();

    await engine.scene.loadFromString(empty.scene.saveToString());

    expect(engine.getActiveScene()).toBeNull();
    expect(engine.getActivePage()).toBeNull();
    expect(engine.scene.getPages()).toEqual([]);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ pageId: null, previousPageId });
    expect(vi.mocked(renderer.removeBlock).mock.calls.map(([id]) => id)).toEqual(previousBlockIds);
    expect(renderer.renderFrame).toHaveBeenCalledOnce();
  });

  it.each([
    "missing",
    "non-page",
    "foreign",
    "detached",
    "unlisted",
    "invalid-scene",
    "no-scene",
  ] as const)("rejects %s loaded references before changing the live document", async (kind) => {
    const firstScene = engine.getActiveScene()!;
    const firstPage = engine.getActivePage()!;
    await engine.scene.create();
    const payload: ScenePayload = JSON.parse(engine.scene.saveToString());
    if (kind === "missing") payload.activePageId = 9999;
    if (kind === "non-page") payload.activePageId = firstScene;
    if (kind === "foreign") payload.activePageId = firstPage;
    if (kind === "detached") {
      const page = payload.blocks.find((block) => block.id === payload.activePageId)!;
      page.parentId = null;
    }
    if (kind === "unlisted") {
      const scene = payload.blocks.find((block) => block.id === payload.activeSceneId)!;
      scene.children = scene.children.filter((id) => id !== payload.activePageId);
    }
    if (kind === "invalid-scene") payload.activeSceneId = firstPage;
    if (kind === "no-scene") payload.activeSceneId = null;
    engine.block.setName(engine.getActivePage()!, "Keep this edit");
    const before = engine.scene.saveToString();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    await expect(engine.scene.loadFromString(JSON.stringify(payload))).rejects.toThrow();

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(true);
    expect(callback).not.toHaveBeenCalled();
  });

  it("validates direct engine scene changes and picks a valid fallback page", async () => {
    const originalScene = engine.getActiveScene()!;
    const originalPage = engine.getActivePage();
    await engine.scene.create();
    const previousPageId = engine.getActivePage();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.setActiveScene(originalScene);

    expect(engine.getActiveScene()).toBe(originalScene);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: originalPage,
      previousPageId,
    });
    expect(() => engine.setActiveScene(9999)).toThrow("Scene 9999");
    expect(() => engine.setActiveScene(originalPage!)).toThrow("is not a scene");
    expect(engine.getActivePage()).toBe(originalPage);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
