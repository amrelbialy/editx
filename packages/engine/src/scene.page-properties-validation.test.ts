import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("page properties validation", () => {
  let engine: EditxEngine;
  let page: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 800, height: 600 });
    page = engine.getActivePage()!;
  });

  it.each([
    null,
    [],
    { name: 1 },
    { name: undefined },
    { width: 500 },
    { height: 500 },
    { width: 0, height: 500 },
    { width: 500, height: -1 },
    { width: Number.NaN, height: 500 },
    { width: 500, height: Infinity },
    { width: "500", height: 500 },
    { backgroundColor: null },
    { backgroundColor: { r: 1, g: 1, b: 1 } },
    { backgroundColor: { r: -0.1, g: 1, b: 1, a: 1 } },
    { backgroundColor: { r: 1, g: 1.1, b: 1, a: 1 } },
    { backgroundColor: { r: 1, g: 1, b: Number.NaN, a: 1 } },
    { backgroundColor: { r: 1, g: 1, b: 1, a: Infinity } },
    { backgroundColor: { r: "1", g: 1, b: 1, a: 1 } },
    { metadata: undefined },
    { metadata: [] },
    { metadata: { count: 1 } },
    { metadata: { nested: { value: "invalid" } } },
    { metadata: new Date() },
    { metadata: new Map() },
    { metadata: { [Symbol("hidden")]: "invalid" } },
    { name: "Must not leak", width: 300, height: 400, metadata: { invalid: false } },
    { unsupported: "invalid" },
  ])("rejects malformed updates before mutation or loss of redo: %j", (update) => {
    engine.clearHistory();
    engine.block.setName(page, "Redo sentinel");
    engine.undo();
    const before = engine.scene.saveToString();
    const history = vi.fn();
    const events = vi.fn();
    const state = vi.fn();
    engine.onHistoryChanged(history);
    engine.event.subscribe([], events);
    engine.on("block:stateChanged", state);
    vi.mocked(renderer.syncBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();
    const set = () => Reflect.apply(engine.scene.setPageProperties, engine.scene, [page, update]);

    expect(set).toThrow();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    expect(history).not.toHaveBeenCalled();
    expect(events).not.toHaveBeenCalled();
    expect(state).not.toHaveBeenCalled();
    expect(renderer.syncBlock).not.toHaveBeenCalled();
    expect(renderer.renderFrame).not.toHaveBeenCalled();
    expect(engine.block.create("text")).toBe(page + 1);
  });

  it("rejects all invalid target forms for reads, updates and both resize entry points", async () => {
    const scene = engine.getActiveScene()!;
    await engine.scene.create();
    const foreign = engine.getActivePage()!;
    engine.setActiveScene(scene);
    const detached = engine.block.create("page");
    const nested = engine.block.create("page");
    engine.block.appendChild(page, nested);
    const text = engine.block.create("text");
    engine.block.appendChild(page, text);
    const store = engine._getBlockStore();
    const listedOnly = engine.block.create("page");
    store.get(scene)!.children.push(listedOnly);
    const parentOnly = engine.block.create("page");
    store.get(parentOnly)!.parentId = scene;
    engine.block.select(text);
    engine.clearHistory();
    engine.block.setName(page, "Redo sentinel");
    engine.undo();
    const before = engine.scene.saveToString();
    const operations = [
      (id: number) => engine.scene.getPageProperties(id),
      (id: number) => engine.scene.setPageProperties(id, { name: "Invalid" }),
      (id: number) => engine.scene.resizePage(id, 100, 100),
      (id: number) => engine.block.setPageDimensions(id, 100, 100),
    ];

    for (const id of [
      9999,
      Number.NaN,
      -1,
      text,
      scene,
      detached,
      nested,
      foreign,
      listedOnly,
      parentOnly,
    ]) {
      for (const operation of operations) {
        expect(() => operation(id)).toThrow(`Page ${id} not found in scene`);
      }
    }
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canRedo()).toBe(true);
    expect(engine.canUndo()).toBe(false);
    expect(engine.block.findAllSelected()).toEqual([text]);
    expect(engine.getActivePage()).toBe(page);
    expect(engine.block.create("text")).toBe(parentOnly + 1);
  });

  it.each(["scene", "block"] as const)("validates both dimensions before %s resizing", (api) => {
    const resize = (width: number, height: number) =>
      api === "scene"
        ? engine.scene.resizePage(page, width, height)
        : engine.block.setPageDimensions(page, width, height);
    const before = engine.scene.saveToString();
    engine.clearHistory();
    for (const [width, height] of [
      [100, 0],
      [-1, 100],
      [NaN, 100],
      [100, -Infinity],
    ]) {
      expect(() => resize(width, height)).toThrow(RangeError);
    }
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    engine.scene.setPageProperties(page, { name: "After failure" });
    engine.undo();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
  });

  it("rejects calls without an active scene before allocating any IDs", () => {
    const empty = new EditxEngine();
    expect(() => empty.scene.getPageProperties(page)).toThrow("No active scene");
    expect(() => empty.scene.setPageProperties(page, {})).toThrow("No active scene");
    expect(() => empty.scene.resizePage(page, 100, 100)).toThrow("No active scene");
    expect(() => empty.block.setPageDimensions(page, 100, 100)).toThrow("No active scene");
    expect(empty.block.create("scene")).toBe(1);
    expect(empty.canUndo()).toBe(true);
  });

  it("validates scene creation and defaults before changing document or notifications", async () => {
    const before = engine.scene.saveToString();
    engine.clearHistory();
    const history = vi.fn();
    engine.onHistoryChanged(history);
    await expect(engine.scene.create({ width: 100, height: 0 })).rejects.toThrow(RangeError);
    expect(() => engine.scene.setDefaultPageDimensions(100, 0)).toThrow(RangeError);
    expect(engine.scene.saveToString()).toBe(before);
    expect(history).not.toHaveBeenCalled();
    expect(engine.block.create("text")).toBe(page + 1);
  });
});
