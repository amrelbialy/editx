import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine, PageExportError, type RendererAdapter } from "./index";

describe("EditxEngine.exportPage", () => {
  let engine: EditxEngine;
  let renderer: RendererAdapter;
  let page: number;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 120, height: 80 });
    page = engine.getActivePage()!;
    engine.scene.addPage({ width: 60, height: 100 });
  });

  it("delegates an inactive page with immutable defaults", async () => {
    const expected = new Blob(["page"], { type: "image/png" });
    vi.mocked(renderer.exportPage!).mockResolvedValue(expected);
    await expect(engine.exportPage(page)).resolves.toBe(expected);
    expect(renderer.exportPage).toHaveBeenCalledWith(page, {
      format: "png",
      quality: 0.92,
      pixelRatio: 1,
    });
    expect(Object.isFrozen(vi.mocked(renderer.exportPage!).mock.calls[0][1])).toBe(true);
    expect(renderer.exportScene).not.toHaveBeenCalled();
  });

  it.each(["png", "jpeg", "webp"] as const)("preserves %s options", async (format) => {
    await engine.exportPage(page, { format, quality: 0, pixelRatio: 1.5 });
    expect(renderer.exportPage).toHaveBeenCalledWith(page, { format, quality: 0, pixelRatio: 1.5 });
  });

  it.each([
    null,
    [],
    "png",
    { format: "gif" },
    { format: null },
    { quality: -0.1 },
    { quality: 1.1 },
    { quality: NaN },
    { quality: Infinity },
    { quality: null },
    { pixelRatio: 0 },
    { pixelRatio: -1 },
    { pixelRatio: NaN },
    { pixelRatio: Infinity },
    { pixelRatio: null },
  ])("rejects malformed options %j before delegating", async (options) => {
    await expect(Reflect.apply(engine.exportPage, engine, [page, options])).rejects.toThrow();
    expect(renderer.exportPage).not.toHaveBeenCalled();
  });

  it("rejects invalid page membership", async () => {
    const store = engine._getBlockStore();
    const detached = store.create("page");
    const foreignScene = store.create("scene");
    const foreign = store.create("page");
    store.appendChild(foreignScene, foreign);
    const graphic = engine.block.create("graphic");
    for (const id of [999, detached, foreign, graphic, engine.getActiveScene()!]) {
      await expect(engine.exportPage(id)).rejects.toMatchObject({
        code: "PAGE_NOT_FOUND",
        pageId: id,
      });
    }
    store.get(page)!.parentId = foreignScene;
    await expect(engine.exportPage(page)).rejects.toMatchObject({ code: "PAGE_NOT_FOUND" });
    expect(renderer.exportPage).not.toHaveBeenCalled();
  });

  it("requires matching scene-child membership in both directions", async () => {
    const scene = engine._getBlockStore().get(engine.getActiveScene()!)!;
    scene.children = scene.children.filter((id) => id !== page);
    await expect(engine.exportPage(page)).rejects.toMatchObject({ code: "PAGE_NOT_FOUND" });
  });

  it("identifies absent scenes, renderers, and legacy adapters", async () => {
    await expect(new EditxEngine().exportPage(page)).rejects.toMatchObject({
      code: "NO_ACTIVE_SCENE",
    });
    const headless = new EditxEngine();
    await headless.scene.create();
    await expect(headless.exportPage(headless.getActivePage()!)).rejects.toMatchObject({
      code: "NO_RENDERER",
    });
    const { exportPage: _exportPage, ...legacyRenderer } = renderer;
    const legacy = new EditxEngine({ renderer: legacyRenderer });
    await legacy.scene.create();
    await expect(legacy.exportPage(legacy.getActivePage()!)).rejects.toMatchObject({
      code: "UNSUPPORTED_RENDERER",
    });
    expect(renderer.exportScene).not.toHaveBeenCalled();
  });

  it.each([false, true])("preserves state and observers on failure=%s", async (fail) => {
    const child = engine.block.create("text");
    engine.block.appendChild(page, child);
    engine.block.select(child);
    engine.block.setName(child, "Undo me");
    engine.undo();
    const before = engine.scene.saveToString();
    const active = engine.getActivePage();
    const calls = Object.values(renderer).filter((value) => vi.isMockFunction(value));
    for (const call of calls) call.mockClear();
    const observer = vi.fn();
    engine.onActivePageChanged(observer);
    engine.onPageOrderChanged(observer);
    engine.onHistoryChanged(observer);
    engine.block.onSelectionChanged(observer);
    engine.event.subscribe([], observer);
    const cause = new Error("encoder failed");
    if (fail) vi.mocked(renderer.exportPage!).mockRejectedValue(cause);

    if (fail) {
      await expect(engine.exportPage(page)).rejects.toMatchObject({
        code: "RENDER_FAILED",
        pageId: page,
        cause,
      });
    } else await engine.exportPage(page);

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.getActivePage()).toBe(active);
    expect(engine.block.findAllSelected()).toEqual([child]);
    expect(engine.canRedo()).toBe(true);
    expect(observer).not.toHaveBeenCalled();
    for (const call of calls.filter((call) => call !== renderer.exportPage)) {
      expect(call).not.toHaveBeenCalled();
    }
  });

  it("retains identified resource failures without hiding their details", async () => {
    const error = new PageExportError("IMAGE_LOAD_FAILED", page, "Missing asset", {
      blockId: 123,
      resource: "missing.png",
    });
    vi.mocked(renderer.exportPage!).mockRejectedValue(error);
    await expect(engine.exportPage(page)).rejects.toBe(error);
  });
});
