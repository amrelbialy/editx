import { describe, expect, it } from "vitest";
import { createThumbnailEngine } from "./__tests__/mocks/page-thumbnail-engine";
import { EditxEngine, type PageThumbnailExportOptions } from "./index";

describe("page thumbnail exports", () => {
  it.each([
    [800, 400, 256, 256, 0.32],
    [400, 800, 256, 256, 0.32],
    [800, 800, 256, 256, 0.32],
    [100, 50, 256, 256, 1],
    [800, 400, 100, 80, 0.125],
    [800, 400, 500, 100, 0.25],
    [800.5, 400.25, 256, 256, 256 / 800.5],
  ])("fits a %sx%s page in %sx%s without upscaling", async (width, height, maxWidth, maxHeight, ratio) => {
    const { engine, render, page } = await createThumbnailEngine(width, height);
    await engine.exportPageThumbnail(page, { maxWidth, maxHeight });
    expect(render).toHaveBeenCalledWith(page, { format: "png", quality: 0.92, pixelRatio: ratio });
    expect(width * ratio).toBeLessThanOrEqual(maxWidth);
    expect(height * ratio).toBeLessThanOrEqual(maxHeight);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("defaults to a 256-pixel bounding box and normalizes omitted bounds independently", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    await engine.exportPageThumbnail(page);
    expect(render).toHaveBeenLastCalledWith(page, {
      format: "png",
      quality: 0.92,
      pixelRatio: 0.32,
    });
    const options: PageThumbnailExportOptions = { maxHeight: 80 };
    await engine.exportPageThumbnail(page, options);
    expect(render).toHaveBeenLastCalledWith(page, {
      format: "png",
      quality: 0.92,
      pixelRatio: 0.2,
    });
  });

  it.each([
    "png",
    "jpeg",
    "webp",
  ] as const)("retains %s encoding options through A6", async (format) => {
    const { engine, render, page } = await createThumbnailEngine();
    await engine.exportPageThumbnail(page, { format, quality: 0.4 });
    expect(render).toHaveBeenCalledWith(page, { format, quality: 0.4, pixelRatio: 0.32 });
  });

  it.each([
    null,
    [],
    "png",
    { maxWidth: 0 },
    { maxWidth: -1 },
    { maxWidth: 1.5 },
    { maxWidth: NaN },
    { maxWidth: Infinity },
    { maxWidth: null },
    { maxWidth: "256" },
    { maxHeight: 0 },
    { maxHeight: -1 },
    { maxHeight: 1.5 },
    { maxHeight: NaN },
    { maxHeight: Infinity },
    { maxHeight: null },
    { format: "gif" },
    { format: null },
    { quality: -1 },
    { quality: 2 },
    { quality: NaN },
    { quality: Infinity },
    { quality: null },
  ])("rejects invalid options %j without rendering", async (options) => {
    const { engine, render, page } = await createThumbnailEngine();
    await expect(
      Reflect.apply(engine.exportPageThumbnail, engine, [page, options]),
    ).rejects.toThrow();
    expect(render).not.toHaveBeenCalled();
  });

  it("requires the same direct-scene membership and renderer capability as page export", async () => {
    const { engine, render, page, renderer } = await createThumbnailEngine();
    const store = engine._getBlockStore();
    const detached = store.create("page");
    const scene = store.create("scene");
    const foreign = store.create("page");
    store.appendChild(scene, foreign);
    for (const id of [999, detached, foreign, engine.block.create("text")]) {
      await expect(engine.exportPageThumbnail(id)).rejects.toMatchObject({
        code: "PAGE_NOT_FOUND",
        pageId: id,
      });
    }
    const headless = new EditxEngine();
    await expect(headless.exportPageThumbnail(page)).rejects.toMatchObject({
      code: "NO_ACTIVE_SCENE",
    });
    await headless.scene.create();
    await expect(headless.exportPageThumbnail(headless.getActivePage()!)).rejects.toMatchObject({
      code: "NO_RENDERER",
    });
    const { exportPage: _exportPage, ...legacyRenderer } = renderer;
    const legacy = new EditxEngine({ renderer: legacyRenderer });
    await legacy.scene.create();
    await expect(legacy.exportPageThumbnail(legacy.getActivePage()!)).rejects.toMatchObject({
      code: "UNSUPPORTED_RENDERER",
    });
    expect(render).not.toHaveBeenCalled();
  });

  it("identifies malformed graphs before attempting to render or using a cache hit", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    await engine.exportPageThumbnail(page);
    engine._getBlockStore().get(page)!.children.push(999);
    await expect(engine.exportPageThumbnail(page)).rejects.toMatchObject({
      code: "RENDER_FAILED",
      pageId: page,
      message: expect.stringContaining("999"),
    });
    expect(render).toHaveBeenCalledOnce();
  });
});
