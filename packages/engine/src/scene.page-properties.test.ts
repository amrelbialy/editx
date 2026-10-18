import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { PAGE_METADATA } from "./block/property-keys";
import { EditxEngine } from "./editx-engine";
import type { BlockEvent, PageMetadata, PageProperties, PagePropertiesUpdate } from "./index";

describe("page properties", () => {
  let engine: EditxEngine;
  let page: number;
  let other: number;
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 800, height: 600 });
    page = engine.getActivePage()!;
    other = engine.scene.addPage({ width: 300, height: 700 });
    engine.clearHistory();
    vi.mocked(renderer.renderFrame).mockClear();
  });

  it("updates a background page atomically in one history entry and lifecycle event", () => {
    const metadata: PageMetadata = { thumbnailAlt: "Cover preview", uiGroup: "Covers" };
    const update: PagePropertiesUpdate = {
      name: "  Cover  ",
      width: 1200,
      height: 1600,
      backgroundColor: { r: 1, g: 0.9, b: 0.8, a: 0.5 },
      metadata,
    };
    const before = engine.scene.saveToString();
    const previousOther = engine.scene.getPageProperties(other);
    const events = vi.fn((batch: BlockEvent[]) => {
      expect(batch).toEqual([{ block: page, type: "updated" }]);
      expect(engine.scene.getPageProperties(page)).toEqual(update);
      expect(engine.canUndo()).toBe(true);
      expect(renderer.renderFrame).toHaveBeenCalledTimes(1);
    });
    const history = vi.fn();
    const navigation = vi.fn();
    const order = vi.fn();
    engine.event.subscribe([page], events);
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(navigation);
    engine.onPageOrderChanged(order);

    engine.scene.setPageProperties(page, update);

    expect(events).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenCalledTimes(1);
    expect(engine.scene.getPageProperties(other)).toEqual(previousOther);
    expect(engine.getActivePage()).toBe(other);
    expect(navigation).not.toHaveBeenCalled();
    expect(order).not.toHaveBeenCalled();
    const after = engine.scene.saveToString();
    events.mockImplementation(() => {});
    engine.undo();
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    engine.redo();
    expect(engine.scene.saveToString()).toBe(after);
    expect(engine.canRedo()).toBe(false);
  });

  it("resizes bounds only without scaling descendants, moving selection or changing camera", () => {
    const text = engine.block.create("text");
    engine.block.appendChild(page, text);
    engine.block.setPosition(text, 700, 500);
    engine.block.setSize(text, 200, 100);
    engine.block.select(text);
    const child = engine.block.getSnapshot(text);
    const original = engine.block.getSnapshot(page)!;
    engine.clearHistory();
    vi.mocked(renderer.setZoom).mockClear();
    vi.mocked(renderer.panTo).mockClear();
    vi.mocked(renderer.fitToScreen).mockClear();
    const selection = vi.fn();
    engine.block.onSelectionChanged(selection);

    engine.scene.resizePage(page, 100, 150);

    expect(engine.block.getPageDimensions(page)).toEqual({ width: 100, height: 150 });
    expect(engine.block.getSnapshot(text)).toEqual(child);
    expect(engine.block.getChildren(page)).toEqual(original.children);
    expect(engine.block.findAllSelected()).toEqual([text]);
    expect(engine.getActivePage()).toBe(other);
    expect(selection).not.toHaveBeenCalled();
    expect(renderer.setZoom).not.toHaveBeenCalled();
    expect(renderer.panTo).not.toHaveBeenCalled();
    expect(renderer.fitToScreen).not.toHaveBeenCalled();
    engine.undo();
    expect(engine.block.getSnapshot(page)).toEqual(original);
    expect(engine.canUndo()).toBe(false);
  });

  it("retains finite positive fractional dimensions without rounding or clamping", () => {
    engine.scene.resizePage(page, Number.MIN_VALUE, 0.5);
    expect(engine.scene.getPageProperties(page)).toMatchObject({
      width: Number.MIN_VALUE,
      height: 0.5,
    });
    expect(engine.block.getPageDimensions(page)).toEqual({ width: Number.MIN_VALUE, height: 0.5 });
  });

  it("copies caller input, getters and snapshots without aliasing stored metadata or colors", () => {
    const metadata = { uiGroup: "Covers" };
    const color = { r: 0.2, g: 0.4, b: 0.6, a: 1 };
    engine.scene.setPageProperties(page, { metadata, backgroundColor: color });
    metadata.uiGroup = "Changed outside";
    color.r = 1;
    const result: PageProperties = engine.scene.getPageProperties(page);
    expect(result.metadata).toEqual({ uiGroup: "Covers" });
    expect(result.backgroundColor.r).toBe(0.2);
    result.backgroundColor.r = 0.9;
    expect(Reflect.set(result.metadata!, "uiGroup", "Getter mutation")).toBe(false);
    const snapshot = engine.block.getSnapshot(page)!;
    const copiedMetadata = snapshot.properties[PAGE_METADATA];
    if (typeof copiedMetadata !== "object") throw new Error("Missing snapshot metadata");
    Reflect.set(copiedMetadata, "uiGroup", "Snapshot mutation");
    expect(engine.scene.getPageProperties(page).metadata).toEqual({ uiGroup: "Covers" });
    expect(engine.scene.getPageProperties(page).backgroundColor.r).toBe(0.2);
    engine.undo();
    expect(engine.scene.getPageProperties(page).metadata).toBeNull();
    engine.redo();
    expect(engine.scene.getPageProperties(page).metadata).toEqual({ uiGroup: "Covers" });
  });

  it("keeps existing name/fill APIs interoperable and preserves exact empty names", () => {
    engine.block.setName(page, "Legacy name");
    engine.block.setPageFillColor(page, { r: 0, g: 0.5, b: 1, a: 1 });
    expect(engine.scene.getPageProperties(page)).toMatchObject({
      name: "Legacy name",
      backgroundColor: { r: 0, g: 0.5, b: 1, a: 1 },
    });
    engine.scene.setPageProperties(page, { name: "", backgroundColor: { r: 1, g: 0, b: 0, a: 1 } });
    expect(engine.block.getName(page)).toBe("");
    expect(engine.block.getPageFillColor(page)).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });
});
