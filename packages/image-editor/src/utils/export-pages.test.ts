import { unzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigationEngine } from "../__tests__/page-navigation-fixture";
import { exportPages } from "./export-pages";

afterEach(() => vi.restoreAllMocks());

describe("page export targets", () => {
  it("exports the current page directly without exporting the scene", async () => {
    const { engine, poster } = await createNavigationEngine();
    engine.scene.setActivePage(poster);
    const expected = new Blob(["poster"], { type: "image/webp" });
    const page = vi.spyOn(engine, "exportPage").mockResolvedValue(expected);
    const scene = vi.spyOn(engine, "exportScene");
    expect(await exportPages(engine, { mode: "current" }, { format: "webp", quality: 0.7 })).toBe(
      expected,
    );
    expect(page).toHaveBeenCalledExactlyOnceWith(poster, { format: "webp", quality: 0.7 });
    expect(scene).not.toHaveBeenCalled();
  });

  it("archives all pages in document order without changing engine state or history", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    engine.scene.movePage(card, 0);
    engine.scene.setActivePage(poster);
    engine.block.select(poster);
    engine.editor.setPageViewMode("active-page");
    const before = engine.scene.saveToString();
    const page = vi
      .spyOn(engine, "exportPage")
      .mockImplementation(async (id) => new Blob([String(id)]));
    const archive = await exportPages(engine, { mode: "all" }, { format: "png" });
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
    expect(archive.type).toBe("application/zip");
    expect(Object.keys(files)).toEqual(["01-Card.png", "02-Cover.png", "03-Poster.png"]);
    expect(page.mock.calls.map(([id]) => id)).toEqual([card, cover, poster]);
    expect(new TextDecoder().decode(files["03-Poster.png"])).toBe(String(poster));
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.scene.getCurrentPage()).toBe(poster);
    expect(engine.block.findAllSelected()).toEqual([poster]);
    expect(engine.editor.getPageViewMode()).toBe("active-page");
    expect(engine.canUndo()).toBe(true);
    expect(engine.canRedo()).toBe(false);
  });

  it("orders selected IDs by document order, removes duplicates, and keeps a single selection zipped", async () => {
    const { engine, cover, card } = await createNavigationEngine();
    const page = vi.spyOn(engine, "exportPage").mockResolvedValue(new Blob(["image"]));
    const archive = await exportPages(
      engine,
      { mode: "selected", ids: [card, cover, card] },
      { format: "jpeg", quality: 0.8 },
    );
    expect(Object.keys(unzipSync(new Uint8Array(await archive.arrayBuffer())))).toEqual([
      "01-Cover.jpg",
      "03-Card.jpg",
    ]);
    expect(page.mock.calls.map(([id]) => id)).toEqual([cover, card]);
    const single = await exportPages(engine, { mode: "selected", ids: [card] }, { format: "jpeg" });
    expect(single.type).toBe("application/zip");
    expect(Object.keys(unzipSync(new Uint8Array(await single.arrayBuffer())))).toEqual([
      "03-Card.jpg",
    ]);
  });

  it("makes safe, unique filenames for duplicate, empty, Unicode, and path-like page names", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    engine.scene.setPageProperties(cover, { name: "../Cover\\bad\u0000" });
    engine.scene.setPageProperties(poster, { name: "" });
    engine.scene.setPageProperties(card, { name: "日本語" });
    vi.spyOn(engine, "exportPage").mockResolvedValue(new Blob(["image"]));
    const archive = await exportPages(engine, { mode: "all" }, { format: "png" });
    const names = Object.keys(unzipSync(new Uint8Array(await archive.arrayBuffer())));
    expect(names).toEqual(["01-..-Cover-bad-.png", "02-page.png", "03-日本語.png"]);
    expect(names.every((name) => !name.includes("/") && !name.includes("\\"))).toBe(true);
  });

  it("rejects empty or stale selections before rendering and never falls back to all pages", async () => {
    const { engine } = await createNavigationEngine();
    const page = vi.spyOn(engine, "exportPage");
    await expect(exportPages(engine, { mode: "selected", ids: [] }, {})).rejects.toThrow(
      "Select at least one",
    );
    await expect(exportPages(engine, { mode: "selected", ids: [-1] }, {})).rejects.toThrow(
      "Page -1 no longer exists",
    );
    expect(page).not.toHaveBeenCalled();
  });

  it("fails the whole archive if any page fails instead of returning partial output", async () => {
    const { engine } = await createNavigationEngine();
    const failure = new Error("Page image could not be loaded");
    const page = vi
      .spyOn(engine, "exportPage")
      .mockResolvedValueOnce(new Blob(["first"]))
      .mockRejectedValueOnce(failure);
    await expect(exportPages(engine, { mode: "all" }, {})).rejects.toBe(failure);
    expect(page).toHaveBeenCalledTimes(2);
  });
});
