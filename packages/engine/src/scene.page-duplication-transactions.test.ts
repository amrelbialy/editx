import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";
import type { BlockEvent } from "./event-api";

describe("page duplication transactions", () => {
  let engine: EditxEngine;
  let first: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 640, height: 480 });
    first = engine.getActivePage()!;
  });

  it("publishes only complete content, hierarchy, activation and settled history", () => {
    const text = engine.block.create("text");
    engine.block.appendChild(first, text);
    engine.clearHistory();
    vi.mocked(renderer.renderFrame).mockClear();
    const assertReady = () => {
      const active = engine.getActivePage()!;
      expect(active).not.toBe(first);
      expect(engine.scene.getPages()).toEqual([first, active]);
      expect(engine.block.getPageDimensions(active)).toEqual({ width: 640, height: 480 });
      const [copiedText] = engine.block.getChildren(active);
      expect(engine.block.getParent(copiedText)).toBe(active);
      expect(engine.block.getType(copiedText)).toBe("text");
      expect(engine.canUndo()).toBe(true);
      expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
    };
    const pages = vi.fn(assertReady);
    const history = vi.fn(() => assertReady());
    const lifecycle = vi.fn(() => assertReady());
    engine.onActivePageChanged(pages);
    engine.onHistoryChanged(history);
    engine.event.subscribe([], lifecycle);

    const duplicate = engine.scene.duplicatePage(first);
    expect(pages).toHaveBeenCalledExactlyOnceWith({
      pageId: duplicate,
      previousPageId: first,
    });
    expect(history).toHaveBeenCalledTimes(1);
    expect(lifecycle).toHaveBeenCalledTimes(1);
  });

  it("coalesces nested duplication batches and replays the first and last navigation", () => {
    engine.clearHistory();
    const pages = vi.fn();
    const history = vi.fn();
    const lifecycle = vi.fn();
    engine.onActivePageChanged(pages);
    engine.onHistoryChanged(history);
    engine.event.subscribe([], lifecycle);
    engine.beginBatch();
    const second = engine.scene.duplicatePage(first);
    engine.beginBatch();
    const third = engine.scene.duplicatePage(first);
    engine.endBatch();
    expect(pages).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    expect(lifecycle).not.toHaveBeenCalled();
    engine.endBatch();

    expect(engine.scene.getPages()).toEqual([first, third, second]);
    expect(pages).toHaveBeenCalledExactlyOnceWith({ pageId: third, previousPageId: first });
    expect(history).toHaveBeenCalledTimes(1);
    expect(lifecycle).toHaveBeenCalledTimes(1);
    engine.undo();
    expect(engine.scene.getPages()).toEqual([first]);
    expect(engine.getActivePage()).toBe(first);
    expect(engine.canUndo()).toBe(false);
    engine.redo();
    expect(engine.scene.getPages()).toEqual([first, third, second]);
    expect(engine.getActivePage()).toBe(third);
  });

  it("keeps a temporarily silent duplication outside an outer batch's history", () => {
    engine.clearHistory();
    const pages = vi.fn();
    const history = vi.fn();
    engine.onActivePageChanged(pages);
    engine.onHistoryChanged(history);
    engine.beginBatch();
    engine.beginSilent();
    const duplicate = engine.scene.duplicatePage(first);
    engine.endSilent();
    engine.endBatch();

    expect(engine.scene.getPages()).toEqual([first, duplicate]);
    expect(pages).toHaveBeenCalledExactlyOnceWith({ pageId: duplicate, previousPageId: first });
    expect(history).not.toHaveBeenCalled();
    expect(engine.canUndo()).toBe(false);
  });

  it("settles reentrant undo without stale creation events or leaked copies", () => {
    const text = engine.block.create("text");
    engine.block.appendChild(first, text);
    engine.clearHistory();
    const events: BlockEvent[][] = [];
    const viewedPages: (number | null)[] = [];
    engine.event.subscribe([], (batch) => events.push(batch));
    engine.onActivePageChanged(({ pageId }) => {
      viewedPages.push(pageId);
      if (pageId !== first) engine.undo();
    });

    const duplicate = engine.scene.duplicatePage(first);

    expect(engine.block.exists(duplicate)).toBe(false);
    expect(engine.scene.getPages()).toEqual([first]);
    expect(engine.getActivePage()).toBe(first);
    expect(viewedPages).toEqual([duplicate, first]);
    expect(events).toHaveLength(2);
    expect(events[0]).toContainEqual({ block: duplicate, type: "created" });
    expect(events[1]).toContainEqual({ block: duplicate, type: "destroyed" });
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
  });

  it("replays recorded scene navigation after the host switches scenes", async () => {
    const originalScene = engine.getActiveScene()!;
    await engine.scene.create();
    const otherScene = engine.getActiveScene()!;
    engine.setActiveScene(originalScene);
    const duplicate = engine.scene.duplicatePage(first);
    engine.setActiveScene(otherScene);

    engine.undo();
    expect(engine.getActiveScene()).toBe(originalScene);
    expect(engine.getActivePage()).toBe(first);
    expect(engine.block.exists(duplicate)).toBe(false);
    engine.setActiveScene(otherScene);
    engine.redo();
    expect(engine.getActiveScene()).toBe(originalScene);
    expect(engine.getActivePage()).toBe(duplicate);
    expect(engine.scene.getPages()).toEqual([first, duplicate]);
  });

  it("clears selected copied descendants on undo without touching source content", () => {
    const text = engine.block.create("text");
    engine.block.appendChild(first, text);
    engine.clearHistory();
    const duplicate = engine.scene.duplicatePage(first);
    const [copiedText] = engine.block.getChildren(duplicate);
    engine.block.select(copiedText);

    engine.undo();

    expect(engine.block.findAllSelected()).toEqual([]);
    expect(engine.block.exists(copiedText)).toBe(false);
    expect(engine.block.getChildren(first)).toEqual([text]);
    expect(engine.canUndo()).toBe(false);
  });
});
