import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivePageError } from "./active-page";
import { EditxEngine } from "./editx-engine";

describe("page identity and navigation", () => {
  let engine: EditxEngine;
  let firstPage: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create();
    firstPage = engine.scene.getCurrentPage()!;
  });

  it.each(["engine", "scene"] as const)("validates activation through %s", (surface) => {
    const sceneId = engine.scene.getScene()!;
    const graphic = engine.block.create("graphic");
    const detached = engine.block.create("page");
    const nested = engine.block.create("page");
    engine.block.appendChild(firstPage, nested);
    const otherScene = engine.block.create("scene");
    const foreign = engine.block.create("page");
    engine.block.appendChild(otherScene, foreign);
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    const setPage =
      surface === "engine"
        ? (id: number) => engine.setActivePage(id)
        : (id: number) => engine.scene.setActivePage(id);
    const targets = [
      [9999, "PAGE_NOT_FOUND"],
      [Number.NaN, "PAGE_NOT_FOUND"],
      [sceneId, "BLOCK_NOT_PAGE"],
      [graphic, "BLOCK_NOT_PAGE"],
      [detached, "PAGE_NOT_IN_ACTIVE_SCENE"],
      [nested, "PAGE_NOT_IN_ACTIVE_SCENE"],
      [foreign, "PAGE_NOT_IN_ACTIVE_SCENE"],
    ] as const;
    const before = engine.scene.saveToString();

    for (const [pageId, code] of targets) {
      expect(() => setPage(pageId)).toThrowError(ActivePageError);
      expect(() => setPage(pageId)).toThrowError(expect.objectContaining({ code, pageId }));
    }

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.getActivePage()).toBe(firstPage);
    expect(callback).not.toHaveBeenCalled();
  });

  it("rejects page activation without an active scene", () => {
    const empty = new EditxEngine();
    const pageId = empty.block.create("page");
    expect(() => empty.scene.setActivePage(pageId)).toThrowError(
      expect.objectContaining({ code: "PAGE_NOT_IN_ACTIVE_SCENE", pageId }),
    );
    expect(empty.getActivePage()).toBeNull();
  });

  it("publishes typed changes on both surfaces and supports unsubscribe", () => {
    const next = engine.scene.addPage();
    const callback = vi.fn();
    const sceneCallback = vi.fn();
    const unsubscribe = engine.onActivePageChanged(callback);
    const unsubscribeScene = engine.scene.onActivePageChanged(sceneCallback);

    engine.scene.setActivePage(firstPage);
    engine.setActivePage(firstPage);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: next,
    });
    expect(sceneCallback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: next,
    });

    unsubscribe();
    unsubscribeScene();
    engine.setActivePage(next);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(sceneCallback).toHaveBeenCalledTimes(1);
  });

  it("preserves both undo and redo history during navigation", () => {
    const next = engine.scene.addPage();
    engine.clearHistory();
    const callback = vi.fn();
    engine.onHistoryChanged(callback);
    engine.scene.setActivePage(firstPage);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    engine.block.setName(firstPage, "Original");
    engine.block.setName(firstPage, "Updated");
    engine.undo();
    callback.mockClear();
    engine.scene.setActivePage(next);
    engine.scene.setActivePage(firstPage);
    expect(engine.canUndo()).toBe(true);
    expect(engine.canRedo()).toBe(true);
    expect(callback).not.toHaveBeenCalled();
    engine.redo();
    expect(engine.block.getName(firstPage)).toBe("Updated");
    engine.undo();
    expect(engine.block.getName(firstPage)).toBe("Original");
  });

  it("does not merge navigation into an open document batch", () => {
    const next = engine.scene.addPage();
    engine.clearHistory();
    engine.beginBatch();
    engine.scene.setActivePage(firstPage);
    engine.scene.setActivePage(next);
    engine.endBatch();
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
  });

  it.each([0, 1, 2])("uses the first remaining page when removing active index %i", (index) => {
    const pages = [firstPage, engine.scene.addPage(), engine.scene.addPage()];
    const removed = pages[index];
    engine.scene.setActivePage(removed);
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.scene.removePage(removed);

    const remaining = pages.filter((id) => id !== removed);
    expect(engine.scene.getPages()).toEqual(remaining);
    expect(engine.scene.getCurrentPage()).toBe(remaining[0]);
    expect(engine.block.isValid(removed)).toBe(false);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: remaining[0],
      previousPageId: removed,
    });
  });

  it("does not notify when a non-active page is removed", () => {
    const active = engine.scene.addPage();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    engine.scene.removePage(firstPage);
    expect(engine.scene.getCurrentPage()).toBe(active);
    expect(callback).not.toHaveBeenCalled();
  });

  it("rejects invalid removals and the last page without side effects", () => {
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    const before = engine.scene.saveToString();
    expect(() => engine.scene.removePage(9999)).toThrow("Page 9999 not found in scene");
    expect(() => engine.scene.removePage(firstPage)).toThrow("Cannot remove the last page");
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it("publishes the first page and page additions once", async () => {
    const empty = new EditxEngine();
    const callback = vi.fn();
    empty.onActivePageChanged(callback);
    await empty.scene.create();
    const initial = empty.scene.getCurrentPage();
    const next = empty.scene.addPage();
    expect(callback).toHaveBeenNthCalledWith(1, {
      pageId: initial,
      previousPageId: null,
    });
    expect(callback).toHaveBeenNthCalledWith(2, {
      pageId: next,
      previousPageId: initial,
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
