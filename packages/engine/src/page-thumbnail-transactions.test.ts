import { describe, expect, it, vi } from "vitest";
import { createThumbnailEngine } from "./__tests__/mocks/page-thumbnail-engine";
import type { BlockData } from "./block/block.types";

describe("page thumbnail document consistency", () => {
  it("reuses byte-equivalent content through undo and redo", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const original = await engine.exportPageThumbnail(page);
    expect(engine.canUndo()).toBe(false);
    engine.scene.setPageProperties(page, { name: "Changed" });
    const changed = await engine.exportPageThumbnail(page);
    expect(changed).not.toBe(original);
    engine.undo();
    expect(await engine.exportPageThumbnail(page)).toBe(original);
    expect(engine.canRedo()).toBe(true);
    engine.redo();
    expect(await engine.exportPageThumbnail(page)).toBe(changed);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("observes silent and nested-batch writes without depending on event delivery", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const before = await engine.exportPageThumbnail(page);
    engine.beginSilent();
    engine.beginBatch();
    try {
      engine.scene.resizePage(page, 400, 800);
      const firstBatch = await engine.exportPageThumbnail(page);
      expect(firstBatch).not.toBe(before);
      engine.beginBatch();
      try {
        engine.scene.setPageProperties(page, { name: "Nested change" });
        expect(await engine.exportPageThumbnail(page)).not.toBe(firstBatch);
      } finally {
        engine.endBatch();
      }
    } finally {
      engine.endBatch();
      engine.endSilent();
    }
    const last = await engine.exportPageThumbnail(page);
    expect(await engine.exportPageThumbnail(page)).toBe(last);
    expect(engine.canUndo()).toBe(false);
    expect(render).toHaveBeenCalledTimes(3);
  });

  it("recognizes changed content loaded under the same IDs and canonicalizes record order", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    engine.block.addText(page, 0, 0, 100, 40, "Hello");
    const original = await engine.exportPageThumbnail(page);
    const payload = JSON.parse(engine.scene.saveToString()) as { blocks: BlockData[] };
    payload.blocks.find((block) => block.id === page)!.name = "Loaded change";
    await engine.scene.loadFromString(JSON.stringify(payload));
    const changed = await engine.exportPageThumbnail(page);
    expect(changed).not.toBe(original);
    payload.blocks.reverse();
    for (const block of payload.blocks) {
      block.properties = Object.fromEntries(Object.entries(block.properties).reverse());
    }
    await engine.scene.loadFromString(JSON.stringify(payload));
    expect(await engine.exportPageThumbnail(page)).toBe(changed);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("invalidates child order and ownership on affected pages only", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const first = engine.block.addText(page, 0, 0, 100, 40, "First");
    const second = engine.block.addText(page, 0, 0, 100, 40, "Second");
    const other = engine.scene.addPage();
    const original = await engine.exportPageThumbnail(page);
    const otherOriginal = await engine.exportPageThumbnail(other);
    engine.block.bringToFront(first);
    expect(engine.block.getChildren(page)).toEqual([second, first]);
    const reordered = await engine.exportPageThumbnail(page);
    expect(reordered).not.toBe(original);
    expect(await engine.exportPageThumbnail(other)).toBe(otherOriginal);
    engine.block.appendChild(other, first);
    expect(await engine.exportPageThumbnail(page)).not.toBe(reordered);
    expect(await engine.exportPageThumbnail(other)).not.toBe(otherOriginal);
    expect(render).toHaveBeenCalledTimes(5);
  });

  it("never serves cached thumbnails for removed pages, but can reuse them after undo", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    engine.scene.addPage();
    const first = await engine.exportPageThumbnail(page);
    engine.scene.removePage(page);
    await expect(engine.exportPageThumbnail(page)).rejects.toMatchObject({
      code: "PAGE_NOT_FOUND",
    });
    engine.undo();
    expect(await engine.exportPageThumbnail(page)).toBe(first);
    expect(render).toHaveBeenCalledOnce();
  });

  it.each([
    false,
    true,
  ])("preserves document, view, history, and observers on failure=%s", async (fail) => {
    const { engine, renderer, render, page } = await createThumbnailEngine();
    const child = engine.block.addText(page, 0, 0, 100, 40, "Hello");
    engine.scene.addPage();
    engine.block.select(child);
    engine.block.setName(child, "Redo marker");
    engine.undo();
    const before = engine.scene.saveToString();
    const active = engine.getActivePage();
    const observer = vi.fn();
    engine.event.subscribe([], observer);
    engine.onActivePageChanged(observer);
    engine.onPageOrderChanged(observer);
    engine.onHistoryChanged(observer);
    engine.block.onSelectionChanged(observer);
    const rendererCalls = Object.values(renderer).filter((value) => vi.isMockFunction(value));
    for (const call of rendererCalls) call.mockClear();
    if (fail) render.mockRejectedValueOnce(new Error("Rendering failed"));
    if (fail)
      await expect(engine.exportPageThumbnail(page)).rejects.toMatchObject({
        code: "RENDER_FAILED",
      });
    else {
      await engine.exportPageThumbnail(page);
      await engine.exportPageThumbnail(page);
    }
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.getActivePage()).toBe(active);
    expect(engine.block.findAllSelected()).toEqual([child]);
    expect(engine.canRedo()).toBe(true);
    expect(observer).not.toHaveBeenCalled();
    for (const call of rendererCalls.filter((call) => call !== render))
      expect(call).not.toHaveBeenCalled();
  });
});
