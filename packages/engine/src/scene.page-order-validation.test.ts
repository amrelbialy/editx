import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("page move validation and no-ops", () => {
  let engine: EditxEngine;
  let first: number;
  let second: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create();
    first = engine.getActivePage()!;
    second = engine.scene.addPage();
    engine.clearHistory();
  });

  it("preserves redo, notifications, selection and rendering for unchanged clamped moves", () => {
    engine.scene.movePage(second, 0);
    engine.undo();
    const before = engine.scene.saveToString();
    const order = vi.fn();
    const history = vi.fn();
    const lifecycle = vi.fn();
    engine.onPageOrderChanged(order);
    engine.onHistoryChanged(history);
    engine.event.subscribe([], lifecycle);
    vi.mocked(renderer.renderFrame).mockClear();

    engine.scene.movePage(first, 0);
    engine.scene.movePage(first, -100);
    engine.scene.movePage(second, 100);

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(order).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    expect(lifecycle).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
    engine.redo();
    expect(engine.scene.getPages()).toEqual([second, first]);
  });

  it("rejects invalid indices and targets without allocation, dirtying or redo loss", async () => {
    const scene = engine.getActiveScene()!;
    await engine.scene.create();
    const foreign = engine.getActivePage()!;
    engine.setActiveScene(scene);
    const detached = engine.block.create("page");
    const nested = engine.block.create("page");
    engine.block.appendChild(first, nested);
    const text = engine.block.create("text");
    engine.block.appendChild(first, text);
    engine.block.select(text);
    engine.clearHistory();
    engine.scene.movePage(second, 0);
    engine.undo();
    const before = engine.scene.saveToString();
    const order = vi.fn();
    const history = vi.fn();
    const navigation = vi.fn();
    const lifecycle = vi.fn();
    engine.onPageOrderChanged(order);
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(navigation);
    engine.event.subscribe([], lifecycle);
    vi.mocked(renderer.renderFrame).mockClear();
    vi.mocked(renderer.syncBlock).mockClear();

    for (const index of [Number.NaN, Infinity, -Infinity, 0.5]) {
      expect(() => engine.scene.movePage(first, index)).toThrow(
        "Page index must be a finite integer",
      );
    }
    for (const id of [9999, Number.NaN, -1, text, detached, nested, foreign]) {
      expect(() => engine.scene.movePage(id, 0)).toThrow(`Page ${id} not found in scene`);
    }

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(engine.block.findAllSelected()).toEqual([text]);
    for (const callback of [order, history, navigation, lifecycle]) {
      expect(callback).not.toHaveBeenCalled();
    }
    expect(renderer.syncBlock).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
    expect(engine.block.create("text")).toBe(text + 1);
  });

  it("requires both parent and scene-child membership", () => {
    const store = engine._getBlockStore();
    const scene = engine.getActiveScene()!;
    const listedOnly = engine.block.create("page");
    store.get(scene)!.children.push(listedOnly);
    const parentOnly = engine.block.create("page");
    store.get(parentOnly)!.parentId = scene;
    const before = engine.scene.saveToString();

    for (const id of [listedOnly, parentOnly]) {
      expect(() => engine.scene.movePage(id, 0)).toThrow(`Page ${id} not found in scene`);
    }
    expect(engine.scene.getPages()).toEqual([first, second]);
    expect(engine.scene.saveToString()).toBe(before);
  });

  it("rejects moving a page without an active scene", () => {
    const empty = new EditxEngine();
    expect(() => empty.scene.movePage(first, 0)).toThrow("No active scene");
    expect(empty.block.create("scene")).toBe(1);
  });
});
