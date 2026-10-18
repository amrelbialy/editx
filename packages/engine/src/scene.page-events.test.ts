import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("atomic page observers", () => {
  let engine: EditxEngine;
  let firstPage: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create();
    firstPage = engine.getActivePage()!;
  });

  it("publishes creation only after dimensions, hierarchy, navigation and history settle", () => {
    const scene = engine.getActiveScene()!;
    let phase: "add" | "undo" | "redo" = "add";
    const assertReady = vi.fn(() => {
      expect(engine.scene.getPages()).toContain(engine.getActivePage());
      expect(engine.canUndo()).toBe(phase !== "undo");
      expect(engine.canRedo()).toBe(phase === "undo");
      if (phase !== "undo") {
        const active = engine.getActivePage()!;
        expect(engine.block.getParent(active)).toBe(scene);
        expect(engine.block.getPageDimensions(active)).toEqual({ width: 320, height: 240 });
      }
    });
    engine.onHistoryChanged(assertReady);
    engine.onActivePageChanged(assertReady);
    const lifecycle = vi.fn(() => assertReady());
    engine.event.subscribe([], lifecycle);
    const added = engine.scene.addPage({ width: 320, height: 240 });
    expect(lifecycle).toHaveBeenCalledExactlyOnceWith([
      { block: scene, type: "updated" },
      { block: added, type: "created" },
    ]);
    expect(assertReady).toHaveBeenCalledTimes(3);

    phase = "undo";
    engine.undo();
    expect(assertReady).toHaveBeenCalledTimes(6);
    phase = "redo";
    engine.redo();
    expect(assertReady).toHaveBeenCalledTimes(9);
  });

  it("publishes removal only after descendants are gone and fallback is active", () => {
    const removed = engine.scene.addPage();
    const child = engine.block.create("text");
    engine.block.appendChild(removed, child);
    engine.block.select(child);
    engine.clearHistory();
    const assertReady = vi.fn(() => {
      expect(engine.getActivePage()).toBe(firstPage);
      expect(engine.block.exists(removed)).toBe(false);
      expect(engine.block.exists(child)).toBe(false);
      expect(engine.block.findAllSelected()).toEqual([]);
      expect(engine.canUndo()).toBe(true);
    });
    engine.onHistoryChanged(assertReady);
    engine.onActivePageChanged(assertReady);
    engine.block.onSelectionChanged(assertReady);
    const lifecycle = vi.fn(() => assertReady());
    engine.event.subscribe([], lifecycle);

    engine.scene.removePage(removed);

    expect(assertReady).toHaveBeenCalledTimes(4);
    expect(lifecycle).toHaveBeenCalledExactlyOnceWith([
      { block: engine.getActiveScene(), type: "updated" },
      { block: removed, type: "destroyed" },
      { block: child, type: "destroyed" },
    ]);
    expect(renderer.renderFrame).toHaveBeenCalled();
  });

  it("rejects invalid removal without dirty rendering, events or redo changes", () => {
    engine.block.setName(firstPage, "Undo this");
    engine.undo();
    const before = engine.scene.saveToString();
    const history = vi.fn();
    const pages = vi.fn();
    const blocks = vi.fn();
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(pages);
    engine.event.subscribe([], blocks);
    vi.mocked(renderer.renderFrame).mockClear();

    expect(() => engine.scene.removePage(firstPage)).toThrow("Cannot remove the last page");
    expect(() => engine.scene.removePage(9999)).toThrow("Page 9999 not found in scene");

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(history).not.toHaveBeenCalled();
    expect(pages).not.toHaveBeenCalled();
    expect(blocks).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
  });
});
