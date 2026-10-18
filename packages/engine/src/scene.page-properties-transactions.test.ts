import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";
import type { PageProperties } from "./page-properties";

describe("page property transactions", () => {
  let engine: EditxEngine;
  let page: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 800, height: 600 });
    page = engine.getActivePage()!;
    engine.clearHistory();
    vi.mocked(renderer.renderFrame).mockClear();
  });

  it("preserves redo and all notifications for effective no-ops across both resize APIs", () => {
    engine.scene.setPageProperties(page, { metadata: { a: "A", b: "B" } });
    engine.clearHistory();
    engine.block.setName(page, "Redo sentinel");
    engine.undo();
    const original = engine.scene.getPageProperties(page);
    const before = engine.scene.saveToString();
    const callbacks = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    engine.onHistoryChanged(callbacks[0]);
    engine.onActivePageChanged(callbacks[1]);
    engine.onPageOrderChanged(callbacks[2]);
    engine.event.subscribe([], callbacks[3]);
    engine.on("block:stateChanged", callbacks[4]);
    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();

    engine.scene.setPageProperties(page, {});
    engine.scene.setPageProperties(page, original);
    engine.scene.setPageProperties(page, { metadata: { b: "B", a: "A" } });
    engine.scene.resizePage(page, 800, 600);
    engine.block.setPageDimensions(page, 800, 600);

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canRedo()).toBe(true);
    expect(engine.canUndo()).toBe(false);
    for (const callback of callbacks) expect(callback).not.toHaveBeenCalled();
    expect(renderer.syncBlock).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
  });

  it.each(["scene", "block"] as const)("resizes atomically through the %s API", (api) => {
    const events = vi.fn(() => {
      expect(engine.block.getPageDimensions(page)).toEqual({ width: 300, height: 400 });
      expect(engine.canUndo()).toBe(true);
    });
    const state = vi.fn(() => {
      expect(engine.block.getPageDimensions(page)).toEqual({ width: 300, height: 400 });
    });
    engine.event.subscribe([page], events);
    engine.on("block:stateChanged", state);
    if (api === "scene") engine.scene.resizePage(page, 300, 400);
    else engine.block.setPageDimensions(page, 300, 400);
    expect(events).toHaveBeenCalledExactlyOnceWith([{ block: page, type: "updated" }]);
    expect(state).toHaveBeenCalledTimes(1);
    expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
    events.mockImplementation(() => {});
    state.mockImplementation(() => {});
    engine.undo();
    expect(engine.block.getPageDimensions(page)).toEqual({ width: 800, height: 600 });
    expect(engine.canUndo()).toBe(false);
    engine.redo();
    expect(engine.block.getPageDimensions(page)).toEqual({ width: 300, height: 400 });
  });

  it("coalesces nested updates and compatibility notifications into settled outer-batch state", () => {
    const before = engine.scene.saveToString();
    const complete = () => {
      expect(engine.scene.getPageProperties(page)).toMatchObject({
        name: "Cover",
        width: 300,
        height: 400,
        metadata: { group: "Covers" },
      });
      expect(engine.canUndo()).toBe(true);
      expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
    };
    const events = vi.fn(complete);
    const state = vi.fn(complete);
    engine.event.subscribe([page], events);
    engine.on("block:stateChanged", state);
    engine.beginBatch();
    engine.scene.setPageProperties(page, { name: "Cover" });
    engine.beginBatch();
    engine.block.setPageDimensions(page, 300, 400);
    engine.endBatch();
    engine.scene.setPageProperties(page, { metadata: { group: "Covers" } });
    expect(events).not.toHaveBeenCalled();
    expect(state).not.toHaveBeenCalled();
    engine.endBatch();
    expect(events).toHaveBeenCalledTimes(1);
    expect(state).toHaveBeenCalledTimes(3);
    events.mockImplementation(() => {});
    state.mockImplementation(() => {});
    engine.undo();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
  });

  it("observes silent outer-batch updates without recording history", () => {
    const events = vi.fn();
    const history = vi.fn();
    engine.event.subscribe([page], events);
    engine.onHistoryChanged(history);
    engine.beginBatch();
    engine.beginSilent();
    engine.scene.setPageProperties(page, { name: "Silent", width: 100, height: 200 });
    engine.endSilent();
    expect(events).not.toHaveBeenCalled();
    engine.endBatch();
    expect(events).toHaveBeenCalledExactlyOnceWith([{ block: page, type: "updated" }]);
    expect(engine.scene.getPageProperties(page)).toMatchObject({
      name: "Silent",
      width: 100,
      height: 200,
    });
    expect(engine.canUndo()).toBe(false);
    expect(history).not.toHaveBeenCalled();
  });

  it("settles reentrant undo without leaking updated metadata into replay snapshots", () => {
    const original = engine.scene.getPageProperties(page);
    const observed: PageProperties[] = [];
    engine.event.subscribe([page], () => {
      observed.push(engine.scene.getPageProperties(page));
      if (observed.length === 1) engine.undo();
    });
    engine.scene.setPageProperties(page, { metadata: { label: "New" }, width: 300, height: 400 });
    expect(observed).toHaveLength(2);
    expect(observed[0].metadata).toEqual({ label: "New" });
    expect(observed[1]).toEqual(original);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    engine.redo();
    expect(engine.scene.getPageProperties(page).metadata).toEqual({ label: "New" });
  });

  it("surfaces observer failures without leaving a batch open or preventing subsequent updates", () => {
    const unsubscribe = engine.event.subscribe([page], () => {
      throw new Error("Host observer failed");
    });
    expect(() => engine.block.setPageDimensions(page, 300, 400)).toThrow("Host observer failed");
    expect(engine.block.getPageDimensions(page)).toEqual({ width: 300, height: 400 });
    expect(engine.canUndo()).toBe(true);
    unsubscribe();
    engine.scene.setPageProperties(page, { name: "Recovered" });
    engine.undo();
    expect(engine.block.getName(page)).not.toBe("Recovered");
    expect(engine.block.getPageDimensions(page)).toEqual({ width: 300, height: 400 });
    engine.undo();
    expect(engine.block.getPageDimensions(page)).toEqual({ width: 800, height: 600 });
  });
});
