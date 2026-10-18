import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";
import type { PageOrderChangedEvent } from "./page-order";

describe("page-order transaction delivery", () => {
  let engine: EditxEngine;
  let pages: number[];
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    renderer.syncChildOrder = vi.fn();
    engine = new EditxEngine({ renderer });
    await engine.scene.create();
    pages = [engine.getActivePage()!, engine.scene.addPage(), engine.scene.addPage()];
    engine.clearHistory();
  });

  it("coalesces nested batches and delivers after history and rendering settle", () => {
    const order = vi.fn((event: PageOrderChangedEvent) => {
      expect(event.pageIds).toEqual(engine.scene.getPages());
      expect(engine.canUndo()).toBe(true);
      expect(renderer.syncChildOrder).toHaveBeenLastCalledWith([...event.pageIds]);
      expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
    });
    const history = vi.fn();
    engine.onPageOrderChanged(order);
    engine.onHistoryChanged(history);
    vi.mocked(renderer.renderFrame).mockClear();
    engine.beginBatch();
    engine.scene.movePage(pages[2], 0);
    engine.beginBatch();
    engine.scene.movePage(pages[1], 0);
    engine.endBatch();
    expect(order).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
    engine.endBatch();

    expect(order).toHaveBeenCalledExactlyOnceWith({
      sceneId: engine.getActiveScene(),
      pageIds: [pages[1], pages[2], pages[0]],
      previousPageIds: pages,
    });
    expect(history).toHaveBeenCalledTimes(1);
  });

  it("suppresses the event when a batch restores the previously published sequence", () => {
    const order = vi.fn();
    engine.onPageOrderChanged(order);
    engine.beginBatch();
    engine.scene.movePage(pages[2], 0);
    engine.scene.movePage(pages[2], 2);
    engine.endBatch();
    expect(engine.scene.getPages()).toEqual(pages);
    expect(order).not.toHaveBeenCalled();
  });

  it("observes temporarily silent moves without putting them in outer-batch history", () => {
    const order = vi.fn();
    const history = vi.fn();
    engine.onPageOrderChanged(order);
    engine.onHistoryChanged(history);
    engine.beginBatch();
    engine.beginSilent();
    engine.scene.movePage(pages[2], 0);
    engine.endSilent();
    engine.endBatch();
    expect(order).toHaveBeenCalledTimes(1);
    expect(engine.canUndo()).toBe(false);
    expect(history).not.toHaveBeenCalled();
  });

  it("does not publish a stale insertion when an earlier activation observer undoes it", () => {
    const order = vi.fn();
    engine.onPageOrderChanged(order);
    engine.onActivePageChanged(({ pageId }) => {
      if (pageId !== pages[2]) engine.undo();
    });
    const copy = engine.scene.duplicatePage(pages[0]);
    expect(engine.block.exists(copy)).toBe(false);
    expect(engine.scene.getPages()).toEqual(pages);
    expect(engine.canRedo()).toBe(true);
    expect(order).not.toHaveBeenCalled();
  });

  it("advances the baseline before a callback performs another move", () => {
    const events: PageOrderChangedEvent[] = [];
    engine.onPageOrderChanged((event) => {
      events.push(event);
      if (events.length === 1) engine.scene.movePage(pages[0], 0);
    });
    engine.scene.movePage(pages[2], 0);
    expect(events.map((event) => event.pageIds)).toEqual([
      [pages[2], pages[0], pages[1]],
      [pages[0], pages[2], pages[1]],
    ]);
    expect(events[1].previousPageIds).toEqual(events[0].pageIds);
  });

  it("surfaces observer failures and resumes subsequent valid notifications", () => {
    const unsubscribe = engine.onPageOrderChanged(() => {
      throw new Error("Host callback failed");
    });
    expect(() => engine.scene.movePage(pages[2], 0)).toThrow("Host callback failed");
    expect(engine.scene.getPages()).toEqual([pages[2], pages[0], pages[1]]);
    expect(engine.canUndo()).toBe(true);
    unsubscribe();
    const order = vi.fn();
    engine.onPageOrderChanged(order);
    engine.scene.movePage(pages[0], 0);
    expect(order).toHaveBeenCalledExactlyOnceWith({
      sceneId: engine.getActiveScene(),
      pageIds: [pages[0], pages[2], pages[1]],
      previousPageIds: [pages[2], pages[0], pages[1]],
    });
  });

  it("syncs scene-root order only after copies are created or removed", () => {
    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.syncChildOrder!).mockClear();
    const copy = engine.scene.duplicatePage(pages[0]);
    const syncs = vi.mocked(renderer.syncBlock);
    const copiedIndex = syncs.mock.calls.findIndex(([id]) => id === copy);
    expect(copiedIndex).toBeGreaterThanOrEqual(0);
    expect(syncs.mock.invocationCallOrder[copiedIndex]).toBeLessThan(
      vi.mocked(renderer.syncChildOrder!).mock.invocationCallOrder[0],
    );
    vi.mocked(renderer.syncChildOrder!).mockClear();
    vi.mocked(renderer.removeBlock).mockClear();
    engine.undo();
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith(pages);
    expect(vi.mocked(renderer.removeBlock).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(renderer.syncChildOrder!).mock.invocationCallOrder[0],
    );
  });
});
