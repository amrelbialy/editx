import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { PAGE_METADATA } from "./block/property-keys";
import { EditxEngine } from "./editx-engine";

describe("page property persistence and independence", () => {
  let engine: EditxEngine;
  let first: number;
  let second: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create({ width: 800, height: 600 });
    first = engine.getActivePage()!;
    second = engine.scene.addPage({ width: 300, height: 700 });
  });

  it("replaces, clears and distinguishes absent from empty metadata in history and serialization", async () => {
    engine.scene.setPageProperties(first, { metadata: { label: "Cover", group: "Covers" } });
    engine.scene.setPageProperties(first, { metadata: { label: "New" } });
    expect(engine.scene.getPageProperties(first).metadata).toEqual({ label: "New" });
    engine.scene.setPageProperties(first, { name: "Does not clear metadata" });
    expect(engine.scene.getPageProperties(first).metadata).toEqual({ label: "New" });
    engine.clearHistory();
    engine.scene.setPageProperties(first, { metadata: {} });
    expect(engine.scene.getPageProperties(first).metadata).toEqual({});
    engine.scene.setPageProperties(first, { metadata: null });
    expect(engine.scene.getPageProperties(first).metadata).toBeNull();
    expect(engine.block.findAllProperties(first)).not.toContain(PAGE_METADATA);
    const restored = new EditxEngine();
    await restored.scene.loadFromString(engine.scene.saveToString());
    expect(restored.scene.getPageProperties(first).metadata).toBeNull();
    engine.undo();
    expect(engine.scene.getPageProperties(first).metadata).toEqual({});
    await restored.scene.loadFromString(engine.scene.saveToString());
    expect(restored.scene.getPageProperties(first).metadata).toEqual({});
    engine.undo();
    expect(engine.scene.getPageProperties(first).metadata).toEqual({ label: "New" });
    expect(engine.canUndo()).toBe(false);
  });

  it("round-trips mixed sizes, backgrounds, names and maps without prototype-key loss", async () => {
    const metadata = Object.fromEntries([
      ["__proto__", "Hint"],
      ["constructor", "Label"],
      ["r", "Red"],
    ]);
    engine.scene.setPageProperties(first, {
      name: "Cover",
      width: 1200,
      height: 1600,
      backgroundColor: { r: 1, g: 0, b: 0, a: 0.5 },
      metadata,
    });
    engine.scene.setPageProperties(second, {
      name: "Back",
      backgroundColor: { r: 0, g: 0, b: 1, a: 1 },
      metadata: Object.assign(Object.create(null), { label: "Back preview" }),
    });
    const restored = new EditxEngine();
    await restored.scene.loadFromString(engine.scene.saveToString());
    expect(restored.scene.getPageProperties(first)).toEqual(engine.scene.getPageProperties(first));
    expect(restored.scene.getPageProperties(second)).toEqual(
      engine.scene.getPageProperties(second),
    );
    expect(restored.getActivePage()).toBe(second);
    expect(restored.canUndo()).toBe(false);
  });

  it("duplicates page hints and properties independently across repeat undo/redo", () => {
    engine.scene.setPageProperties(first, {
      name: "Cover",
      width: 1200,
      height: 1600,
      metadata: { label: "Cover preview" },
      backgroundColor: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
    });
    engine.clearHistory();
    const original = engine.scene.getPageProperties(first);
    const duplicate = engine.scene.duplicatePage(first);
    expect(engine.scene.getPageProperties(duplicate)).toEqual(original);
    const sourceMetadata = engine._getBlockStore().getProperty(first, PAGE_METADATA);
    const copiedMetadata = engine._getBlockStore().getProperty(duplicate, PAGE_METADATA);
    expect(copiedMetadata).not.toBe(sourceMetadata);
    engine.scene.setPageProperties(duplicate, { metadata: { label: "Independent" } });
    expect(engine.scene.getPageProperties(first)).toEqual(original);
    engine.undo();
    expect(engine.scene.getPageProperties(duplicate)).toEqual(original);
    for (let cycle = 0; cycle < 3; cycle++) {
      engine.undo();
      expect(engine.block.exists(duplicate)).toBe(false);
      expect(engine.scene.getPageProperties(first)).toEqual(original);
      engine.redo();
      expect(engine.scene.getPageProperties(duplicate)).toEqual(original);
    }
  });

  it("keeps authored properties independent of navigation, layout, defaults and view", async () => {
    const renderer = createMockRenderer();
    const viewed = new EditxEngine({ renderer });
    await viewed.scene.loadFromString(engine.scene.saveToString());
    engine = viewed;
    engine.scene.setPageProperties(first, { metadata: { label: "Cover" } });
    const a = engine.scene.getPageProperties(first);
    const b = engine.scene.getPageProperties(second);
    engine.scene.setDefaultPageDimensions(900, 1000);
    engine.scene.setAspectRatioLock(true);
    engine.editor.setZoom(2);
    engine.editor.panTo(75, 100);
    engine.editor.fitToScreen();
    expect(renderer.setZoom).toHaveBeenCalledWith(2, false);
    expect(renderer.panTo).toHaveBeenCalledWith(75, 100);
    for (const layout of ["VerticalStack", "HorizontalStack", "DepthStack", "Free"] as const) {
      engine.scene.setPageLayout(layout);
      engine.scene.setActivePage(first);
      engine.scene.setActivePage(second);
      engine.scene.movePage(second, 0);
      engine.scene.movePage(first, 0);
      expect(engine.scene.getPageProperties(first)).toEqual(a);
      expect(engine.scene.getPageProperties(second)).toEqual(b);
    }
    const added = engine.scene.addPage();
    expect(engine.block.getPageDimensions(added)).toEqual({ width: 900, height: 1000 });
    engine.scene.resizePage(first, 200, 400);
    expect(engine.scene.getDefaultPageDimensions()).toEqual({ width: 900, height: 1000 });
    expect(engine.scene.getPageProperties(second)).toEqual(b);
    engine.scene.setActivePage(second);
    engine.undo();
    expect(engine.scene.getPageProperties(first)).toEqual(a);
    expect(engine.getActivePage()).toBe(second);
    engine.scene.setActivePage(first);
    engine.redo();
    expect(engine.getActivePage()).toBe(first);
    expect(engine.scene.getPageProperties(second)).toEqual(b);
  });
});
