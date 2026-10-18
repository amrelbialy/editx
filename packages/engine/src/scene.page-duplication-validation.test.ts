import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("page duplication validation", () => {
  let engine: EditxEngine;
  let first: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create();
    first = engine.getActivePage()!;
  });

  it("rejects invalid targets without allocation, history loss, selection changes or events", async () => {
    const originalScene = engine.getActiveScene()!;
    await engine.scene.create();
    const foreignPage = engine.getActivePage()!;
    engine.setActiveScene(originalScene);
    const detached = engine.block.create("page");
    const nested = engine.block.create("page");
    engine.block.appendChild(first, nested);
    const wrongType = engine.block.create("text");
    engine.block.appendChild(originalScene, wrongType);
    const lastAllocated = wrongType;
    engine.block.select(wrongType);
    engine.clearHistory();
    engine.block.setName(first, "Redo sentinel");
    engine.undo();
    const before = engine.scene.saveToString();
    const history = vi.fn();
    const pages = vi.fn();
    const selection = vi.fn();
    const lifecycle = vi.fn();
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(pages);
    engine.block.onSelectionChanged(selection);
    engine.event.subscribe([], lifecycle);
    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();

    for (const id of [9999, Number.NaN, -1, wrongType, foreignPage, detached, nested]) {
      expect(() => engine.scene.duplicatePage(id)).toThrow(`Page ${id} not found in scene`);
    }

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(engine.block.findAllSelected()).toEqual([wrongType]);
    expect(history).not.toHaveBeenCalled();
    expect(pages).not.toHaveBeenCalled();
    expect(selection).not.toHaveBeenCalled();
    expect(lifecycle).not.toHaveBeenCalled();
    expect(renderer.syncBlock).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
    expect(engine.scene.duplicatePage(first)).toBe(lastAllocated + 1);
  });

  it("requires both parent and scene child-list membership", () => {
    const store = engine._getBlockStore();
    const scene = engine.getActiveScene()!;
    const listedOnly = engine.block.create("page");
    store.get(scene)!.children.push(listedOnly);
    const parentOnly = engine.block.create("page");
    store.get(parentOnly)!.parentId = scene;
    const before = engine.scene.saveToString();

    for (const id of [listedOnly, parentOnly]) {
      expect(() => engine.scene.duplicatePage(id)).toThrow(`Page ${id} not found in scene`);
    }
    expect(engine.scene.saveToString()).toBe(before);
  });

  it.each([
    "missing resource",
    "cycle",
    "inconsistent child",
    "external parent",
  ])("rejects a %s before copying any blocks", (invalid) => {
    const store = engine._getBlockStore();
    const child = engine.block.create("graphic");
    engine.block.appendChild(first, child);
    const fill = engine.block.createFill("color");
    engine.block.setFill(child, fill);
    if (invalid === "missing resource") store.get(child)!.fillId = 9999;
    if (invalid === "cycle") store.get(fill)!.fillId = fill;
    if (invalid === "inconsistent child") store.get(child)!.parentId = null;
    if (invalid === "external parent") store.get(fill)!.parentId = engine.getActiveScene();
    engine.clearHistory();
    const before = engine.scene.saveToString();
    const history = vi.fn();
    engine.onHistoryChanged(history);
    const lastAllocated = fill;

    expect(() => engine.scene.duplicatePage(first)).toThrow();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(history).not.toHaveBeenCalled();
    expect(engine.block.create("text")).toBe(lastAllocated + 1);
  });

  it("rejects duplication when there is no active scene", () => {
    const empty = new EditxEngine();
    expect(() => empty.scene.duplicatePage(first)).toThrow("No active scene");
    expect(empty.block.create("scene")).toBe(1);
    expect(empty.canRedo()).toBe(false);
  });
});
