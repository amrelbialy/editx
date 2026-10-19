import { describe, expect, it } from "vitest";
import { createThumbnailEngine, deferredBlob } from "./__tests__/mocks/page-thumbnail-engine";
import { PageExportError } from "./page-export-error";

describe("page thumbnail concurrency and lifetime", () => {
  it("deduplicates in-flight work for the same page content and options", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const deferred = deferredBlob();
    render.mockReturnValue(deferred.promise);
    const first = engine.exportPageThumbnail(page);
    const second = engine.exportPageThumbnail(page);
    expect(render).toHaveBeenCalledOnce();
    const blob = new Blob(["thumbnail"]);
    deferred.resolve(blob);
    expect(await first).toBe(blob);
    expect(await second).toBe(blob);
    expect(await engine.exportPageThumbnail(page)).toBe(blob);
    expect(render).toHaveBeenCalledOnce();
  });

  it("does not let old content finishing late replace the newer result", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const old = deferredBlob();
    const current = deferredBlob();
    render.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const first = engine.exportPageThumbnail(page);
    engine.scene.resizePage(page, 400, 800);
    const second = engine.exportPageThumbnail(page);
    const currentBlob = new Blob(["current"]);
    current.resolve(currentBlob);
    expect(await second).toBe(currentBlob);
    const oldBlob = new Blob(["old"]);
    old.resolve(oldBlob);
    expect(await first).toBe(oldBlob);
    expect(await engine.exportPageThumbnail(page)).toBe(currentBlob);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("evicts failures, preserves their details, and permits retry", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const error = new PageExportError("FONT_LOAD_FAILED", page, "Font missing", {
      blockId: 42,
      resource: "Test Font",
    });
    render.mockRejectedValueOnce(error);
    const failed = engine.exportPageThumbnail(page);
    const sameFailure = engine.exportPageThumbnail(page);
    await expect(failed).rejects.toBe(error);
    await expect(sameFailure).rejects.toBe(error);
    await expect(engine.exportPageThumbnail(page)).resolves.toBeInstanceOf(Blob);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("does not let an older rejection remove a newer in-flight job", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const old = deferredBlob();
    const current = deferredBlob();
    render.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const first = engine.exportPageThumbnail(page);
    engine.scene.resizePage(page, 400, 800);
    const second = engine.exportPageThumbnail(page);
    old.reject(new Error("old failure"));
    await expect(first).rejects.toMatchObject({ code: "RENDER_FAILED" });
    const third = engine.exportPageThumbnail(page);
    expect(render).toHaveBeenCalledTimes(2);
    const blob = new Blob(["new"]);
    current.resolve(blob);
    expect(await second).toBe(blob);
    expect(await third).toBe(blob);
  });

  it("does not evict pending requests when the successful-result cache fills", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const pending = deferredBlob();
    render.mockReturnValueOnce(pending.promise);
    const first = engine.exportPageThumbnail(page, { maxWidth: 1 });
    for (let width = 2; width <= 66; width++)
      await engine.exportPageThumbnail(page, { maxWidth: width });
    const same = engine.exportPageThumbnail(page, { maxWidth: 1 });
    expect(render).toHaveBeenCalledTimes(66);
    const blob = new Blob(["slow"]);
    pending.resolve(blob);
    expect(await first).toBe(blob);
    expect(await same).toBe(blob);
  });

  it("clears cache references and rejects late completions after engine disposal", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    await engine.exportPageThumbnail(page);
    const pending = deferredBlob();
    render.mockReturnValueOnce(pending.promise);
    const late = engine.exportPageThumbnail(page, { maxWidth: 100 });
    engine.dispose();
    pending.resolve(new Blob(["late"]));
    await expect(late).rejects.toMatchObject({ code: "RENDER_FAILED", pageId: page });
    await expect(engine.exportPageThumbnail(page)).rejects.toMatchObject({ code: "RENDER_FAILED" });
    expect(render).toHaveBeenCalledTimes(2);
  });
});
