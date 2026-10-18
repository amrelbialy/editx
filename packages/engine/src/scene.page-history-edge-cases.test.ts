import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("page history edge cases", () => {
  let engine: EditxEngine;
  let firstPage: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 800, height: 600 });
    firstPage = engine.getActivePage()!;
  });

  it("collapses nested mixed page batches and replays first-before/last-after navigation", () => {
    const history = vi.fn();
    engine.onHistoryChanged(history);

    engine.beginBatch();
    const second = engine.scene.addPage();
    engine.beginBatch();
    const transient = engine.scene.addPage();
    engine.scene.removePage(transient);
    engine.endBatch();
    expect(history).not.toHaveBeenCalled();
    const final = engine.scene.addPage();
    engine.endBatch();

    expect(engine.scene.getPages()).toEqual([firstPage, second, final]);
    expect(engine.getActivePage()).toBe(final);
    expect(history).toHaveBeenCalledTimes(1);

    engine.undo();
    expect(engine.scene.getPages()).toEqual([firstPage]);
    expect(engine.getActivePage()).toBe(firstPage);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);

    engine.redo();
    expect(engine.scene.getPages()).toEqual([firstPage, second, final]);
    expect(engine.getActivePage()).toBe(final);
    expect(engine.canRedo()).toBe(false);
    expect(history).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["the first remaining page", true],
    ["null when no page remains", false],
  ])("reconciles a stale redo marker to %s", (_label, keepFirstPage) => {
    engine.clearHistory();
    engine.beginBatch();
    const staleTarget = engine.scene.addPage();
    engine.block.destroy(staleTarget);
    if (!keepFirstPage) engine.block.destroy(firstPage);
    engine.endBatch();

    expect(engine.getActivePage()).toBe(keepFirstPage ? firstPage : null);
    engine.undo();
    expect(engine.scene.getPages()).toEqual([firstPage]);
    expect(engine.getActivePage()).toBe(firstPage);

    engine.redo();
    expect(engine.block.exists(staleTarget)).toBe(false);
    expect(engine.getActivePage()).toBe(keepFirstPage ? firstPage : null);
    expect(engine.scene.getPages()).toEqual(keepFirstPage ? [firstPage] : []);
  });

  it("keeps nested silent page changes observable without recording history", () => {
    const history = vi.fn();
    const pages = vi.fn();
    const lifecycle = vi.fn();
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(pages);
    engine.event.subscribe([], lifecycle);

    engine.beginSilent();
    engine.beginSilent();
    const added = engine.scene.addPage();
    engine.endSilent();
    engine.scene.removePage(added);
    engine.endSilent();

    expect(engine.scene.getPages()).toEqual([firstPage]);
    expect(engine.getActivePage()).toBe(firstPage);
    expect(pages.mock.calls.map(([event]) => event)).toEqual([
      { pageId: added, previousPageId: firstPage },
      { pageId: firstPage, previousPageId: added },
    ]);
    expect(lifecycle).toHaveBeenCalledTimes(2);
    expect(history).not.toHaveBeenCalled();
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
  });

  it("does not record a batch containing only a temporarily silent command", () => {
    const history = vi.fn();
    engine.onHistoryChanged(history);

    engine.beginBatch();
    engine.beginSilent();
    const added = engine.scene.addPage();
    engine.endSilent();
    engine.endBatch();

    expect(engine.scene.getPages()).toEqual([firstPage, added]);
    expect(engine.getActivePage()).toBe(added);
    expect(history).not.toHaveBeenCalled();
    expect(engine.canUndo()).toBe(false);
  });

  it("defers batch callbacks, suppresses net navigation, and settles history first", () => {
    const pages = vi.fn();
    const selections = vi.fn((ids: number[]) => {
      expect(engine.canUndo()).toBe(true);
      expect(ids.every((id) => engine.block.exists(id))).toBe(true);
    });
    const history = vi.fn(() => {
      expect(engine.getActivePage()).toBe(firstPage);
      expect(engine.canUndo()).toBe(true);
    });
    engine.onActivePageChanged(pages);
    engine.block.onSelectionChanged(selections);
    engine.onHistoryChanged(history);
    engine.beginBatch();
    const added = engine.scene.addPage();
    const child = engine.block.create("text");
    engine.block.appendChild(added, child);
    engine.block.select(child);
    engine.scene.removePage(added);
    expect(pages).not.toHaveBeenCalled();
    expect(selections).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    engine.endBatch();

    expect(engine.getActivePage()).toBe(firstPage);
    expect(pages).not.toHaveBeenCalled();
    expect(selections).toHaveBeenCalledExactlyOnceWith([]);
    expect(history).toHaveBeenCalledTimes(1);
  });

  it("keeps reentrant undo notifications consistent after active-page removal", () => {
    const removed = engine.scene.addPage();
    const child = engine.block.create("text");
    engine.block.appendChild(removed, child);
    engine.block.select(child);
    engine.clearHistory();
    const pageIds: Array<number | null> = [];
    const lifecycleBatches: Array<Array<{ block: number; type: string }>> = [];
    let undid = false;
    engine.onActivePageChanged((event) => {
      expect(event.pageId).toBe(engine.getActivePage());
      pageIds.push(event.pageId);
    });
    engine.event.subscribe([], (events) => {
      lifecycleBatches.push(events);
      for (const event of events) {
        expect(engine.block.exists(event.block)).toBe(event.type !== "destroyed");
      }
    });
    engine.block.onSelectionChanged((ids) => {
      if (ids.length === 0 && !undid) {
        undid = true;
        engine.undo();
      }
    });
    engine.scene.removePage(removed);
    expect(undid).toBe(true);
    expect(engine.getActivePage()).toBe(removed);
    expect(engine.block.exists(child)).toBe(true);
    expect(engine.block.findAllSelected()).toEqual([]);
    expect(pageIds).not.toContain(firstPage);
    expect(lifecycleBatches.length).toBeGreaterThan(0);
    expect(engine.canRedo()).toBe(true);
  });

  it("clears selection of silent descendants destroyed by undoing page creation", () => {
    const added = engine.scene.addPage();
    engine.beginSilent();
    const child = engine.block.create("text");
    engine.block.appendChild(added, child);
    engine.block.select(child);
    engine.endSilent();

    engine.undo();

    expect(engine.block.exists(added)).toBe(false);
    expect(engine.block.exists(child)).toBe(false);
    expect(engine.block.findAllSelected()).toEqual([]);
  });

  it("rejects invalid dimensions before allocation, dirtying, events, or redo loss", () => {
    const lastAllocated = engine.block.create("text");
    engine.clearHistory();
    engine.block.setName(firstPage, "redo sentinel");
    engine.undo();
    const before = engine.scene.saveToString();
    const history = vi.fn();
    const pages = vi.fn();
    const lifecycle = vi.fn();
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(pages);
    engine.event.subscribe([], lifecycle);
    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.removeBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();

    for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => engine.scene.addPage({ width: invalid, height: 100 })).toThrow(
        "Page dimensions must be finite positive numbers",
      );
      expect(() => engine.scene.addPage({ width: 100, height: invalid })).toThrow(
        "Page dimensions must be finite positive numbers",
      );
    }

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(history).not.toHaveBeenCalled();
    expect(pages).not.toHaveBeenCalled();
    expect(lifecycle).not.toHaveBeenCalled();
    expect(renderer.syncBlock).not.toHaveBeenCalled();
    expect(renderer.removeBlock).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();

    expect(engine.scene.addPage({ width: 100, height: 100 })).toBe(lastAllocated + 1);
  });

  it("restores recorded scene navigation after switching to another scene", async () => {
    const originalScene = engine.getActiveScene()!;
    await engine.scene.create();
    const otherScene = engine.getActiveScene()!;
    engine.setActiveScene(originalScene);
    const added = engine.scene.addPage();
    engine.setActiveScene(otherScene);

    engine.undo();
    expect(engine.getActiveScene()).toBe(originalScene);
    expect(engine.getActivePage()).toBe(firstPage);
    expect(engine.block.exists(added)).toBe(false);

    engine.setActiveScene(otherScene);
    engine.redo();
    expect(engine.getActiveScene()).toBe(originalScene);
    expect(engine.getActivePage()).toBe(added);
  });
});
