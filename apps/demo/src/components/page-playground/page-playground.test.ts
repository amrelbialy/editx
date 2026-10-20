import { EditxEngine, hexToColor } from "@editx/engine";
import { beforeEach, describe, expect, it } from "vitest";
import { getPageMetadata } from "../seo";
import { addPlaygroundPage, seedPagePlayground } from "./page-playground-scene";
import { readPlaygroundSnapshot } from "./use-page-observations";

describe("multi-page playground public SDK integration", () => {
  let engine: EditxEngine;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create({ width: 800, height: 600 });
    seedPagePlayground(engine);
  });

  it("seeds resource-free mixed pages and grouped artwork without initial history or selection", () => {
    const state = readPlaygroundSnapshot(engine);
    expect(state.pages.map(({ name, width, height }) => ({ name, width, height }))).toEqual([
      { name: "Cover", width: 800, height: 600 },
      { name: "Poster", width: 600, height: 800 },
      { name: "Card", width: 400, height: 400 },
    ]);
    expect(state.activePageId).toBe(state.pages[0].id);
    expect(state.topPageId).toBe(state.pages[2].id);
    expect(state.selection).toEqual([]);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.pages[0].backgroundColor).toEqual(hexToColor("#fff1f2"));
    for (const page of state.pages) {
      expect(page.metadata?.thumbnailAlt).toBe(`${page.name} preview`);
      expect(engine.block.getPageImageSrc(page.id)).toBe("");
      const children = engine.block.getChildren(page.id);
      expect(children).toHaveLength(2);
      const group = children.find((id) => engine.block.getType(id) === "group")!;
      expect(engine.block.getChildren(group)).toHaveLength(2);
    }
  });

  it("adds a complete sample page in one history entry and restores the same IDs on replay", () => {
    const before = engine.scene.saveToString();
    addPlaygroundPage(engine);
    const after = engine.scene.saveToString();
    const state = readPlaygroundSnapshot(engine);
    expect(state.pages).toHaveLength(4);
    const added = state.pages[3];
    expect(added).toMatchObject({ name: "Cover", width: 800, height: 600 });
    expect(state.activePageId).toBe(added.id);
    expect(engine.block.getChildren(added.id)).toHaveLength(2);
    engine.undo();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    engine.redo();
    expect(engine.scene.saveToString()).toBe(after);
  });

  it("observes activation separately from explicit document reordering", () => {
    const before = readPlaygroundSnapshot(engine);
    const first = before.pages[0].id;
    engine.scene.setActivePage(first);
    const activated = readPlaygroundSnapshot(engine);
    expect(activated.activePageId).toBe(first);
    expect(activated.topPageId).toBe(before.topPageId);
    expect(activated.canUndo).toBe(false);
    engine.scene.movePage(first, activated.pages.length - 1);
    const reordered = readPlaygroundSnapshot(engine);
    expect(reordered.topPageId).toBe(first);
    expect(reordered.activePageId).toBe(first);
    expect(reordered.canUndo).toBe(true);
    engine.undo();
    expect(readPlaygroundSnapshot(engine).topPageId).toBe(before.topPageId);
    expect(engine.scene.getCurrentPage()).toBe(first);
  });

  it("restores the entire saved document after duplication and property changes", async () => {
    const before = readPlaygroundSnapshot(engine);
    const saved = engine.scene.saveToString();
    const duplicate = engine.scene.duplicatePage(before.pages[0].id);
    engine.scene.setPageProperties(duplicate, {
      name: "Changed",
      width: 200,
      height: 250,
      metadata: { thumbnailAlt: "Changed" },
    });
    await engine.scene.loadFromString(saved);
    expect(readPlaygroundSnapshot(engine)).toEqual(before);
    expect(engine.block.exists(duplicate)).toBe(false);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
  });

  it("registers the diagnostic route with distinct noindex metadata", () => {
    const metadata = getPageMetadata("/playground/pages");
    expect(metadata.title).toBe("Editx Multi-page SDK Playground");
    expect(metadata.robots).toBe("noindex, nofollow");
    expect(getPageMetadata("/playground").title).toBe("Editx Image Editor Playground");
  });
});
