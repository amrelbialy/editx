import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { VISIBLE } from "../block/property-keys";
import { KonvaPageView } from "./konva-page-view";
import { KonvaRendererContext } from "./konva-renderer-context";

function data(
  id: number,
  type: BlockData["type"],
  parentId: number | null,
  children: number[] = [],
  properties: BlockData["properties"] = {},
): BlockData {
  return { id, type, parentId, children, properties, kind: "" } as BlockData;
}

function setup() {
  const blocks = new Map<number, BlockData>();
  const context = new KonvaRendererContext({ resolveBlock: (id) => blocks.get(id) });
  const content = new Konva.Group() as Konva.Group & { batchDraw: ReturnType<typeof vi.fn> };
  content.batchDraw = vi.fn();
  context.contentLayer = content as unknown as Konva.Layer;
  context.uiLayer = { batchDraw: vi.fn() } as unknown as Konva.Layer;
  context.camera = {
    setPageSize: vi.fn(),
    setPageNavigationBounds: vi.fn(() => true),
    clearPageSize: vi.fn(),
    reapplyViewport: vi.fn(),
  } as never;
  context.transformer = {
    nodes: vi.fn((nodes?: Konva.Node[]) => nodes ?? []),
  } as unknown as Konva.Transformer;
  const view = new KonvaPageView(context);
  return { blocks, content, context, view };
}

function populate() {
  const fixture = setup();
  const { blocks, content, context, view } = fixture;
  blocks.set(10, data(10, "scene", null, [1, 2]));
  blocks.set(1, data(1, "page", 10, [3]));
  blocks.set(2, data(2, "page", 10, [4]));
  blocks.set(3, data(3, "group", 1, [5]));
  blocks.set(4, data(4, "graphic", 2));
  blocks.set(5, data(5, "text", 3));
  const page1 = new Konva.Group();
  const page2 = new Konva.Group();
  const group = new Konva.Group({ x: 10, y: 20 });
  group.setAttr("isGroup", true);
  const graphic = new Konva.Rect({ x: 7, y: 9 });
  const text = new Konva.Rect({ x: 2, y: 3 });
  group.add(text);
  content.add(page1, page2, group, graphic);
  for (const [id, node] of [
    [1, page1],
    [2, page2],
    [3, group],
    [4, graphic],
    [5, text],
  ] as const) {
    context.nodeMap.set(id, node);
  }
  view.initialize(data(1, "page", 10, [], { "page/width": 100, "page/height": 80 }));
  view.recordPage(data(2, "page", 10, [], { "page/width": 200, "page/height": 120 }));
  return { ...fixture, page1, page2, group, graphic, text };
}

describe("KonvaPageView continuous wrappers", () => {
  it("places page roots in mixed-size vertical and horizontal frames exactly once", () => {
    const { view, context, page1, page2, group, graphic, text } = populate();
    view.set({
      mode: "vertical-pages",
      activePageId: 1,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    expect(view.getBounds(1)).toEqual({ x: 50, y: 0, width: 100, height: 80 });
    expect(view.getBounds(2)).toEqual({ x: 0, y: 160, width: 200, height: 120 });
    expect(page1.getParent()).toBe(group.getParent());
    expect(page2.getParent()).toBe(graphic.getParent());
    expect(group.position()).toEqual({ x: 10, y: 20 });
    expect(graphic.position()).toEqual({ x: 7, y: 9 });
    expect(text.getAbsolutePosition()).toEqual({ x: 62, y: 23 });
    expect(graphic.getAbsolutePosition()).toEqual({ x: 7, y: 169 });
    expect(context.camera.setPageNavigationBounds).toHaveBeenLastCalledWith(200, 280, {
      minX: 100,
      maxX: 100,
      minY: 40,
      maxY: 220,
    });

    view.set({
      mode: "horizontal-pages",
      activePageId: 1,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    expect(view.getBounds(1)).toEqual({ x: 0, y: 20, width: 100, height: 80 });
    expect(view.getBounds(2)).toEqual({ x: 180, y: 0, width: 200, height: 120 });
    expect(group.position()).toEqual({ x: 10, y: 20 });
    expect(graphic.getAbsolutePosition()).toEqual({ x: 187, y: 9 });
    expect(context.camera.setPageNavigationBounds).toHaveBeenLastCalledWith(380, 120, {
      minX: 50,
      maxX: 280,
      minY: 60,
      maxY: 60,
    });
  });

  it("adopts a newly synced page child without duplicating its frame offset", () => {
    const { view, blocks, content, context } = populate();
    view.set({
      mode: "vertical-pages",
      activePageId: 2,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    blocks.set(6, data(6, "text", 2));
    const text = new Konva.Rect({ x: 90, y: 40, width: 100, height: 30 });
    text.setAttr("blockId", 6);
    content.add(text);
    context.nodeMap.set(6, text);

    view.recordNodeSync(6, text);
    expect(text.position()).toEqual({ x: 90, y: 40 });
    expect(text.getAbsolutePosition()).toEqual({ x: 90, y: 200 });
    view.recordNodeSync(6, text);
    expect(text.getAbsolutePosition()).toEqual({ x: 90, y: 200 });
  });

  it("keeps union camera bounds when the active page is resynced", () => {
    const { view, context } = populate();
    view.set({
      mode: "vertical-pages",
      activePageId: 2,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    vi.mocked(context.camera.setPageNavigationBounds).mockClear();
    vi.mocked(context.camera.reapplyViewport).mockClear();

    view.recordPage(data(2, "page", 10, [4], { "page/width": 200, "page/height": 120 }));

    expect(context.camera.setPageNavigationBounds).not.toHaveBeenCalled();
    expect(context.camera.reapplyViewport).not.toHaveBeenCalled();
    expect(context.lastPageSize).toEqual({ width: 200, height: 280 });
  });

  it("restores parents, local positions, and authored visibility across all modes", () => {
    const { view, content, blocks, graphic } = populate();
    blocks.set(4, data(4, "graphic", 2, [], { [VISIBLE]: false }));
    graphic.visible(false);
    view.set({
      mode: "vertical-pages",
      activePageId: 1,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    view.set({ mode: "all-pages" });
    expect(graphic.getParent()).toBe(content);
    expect(graphic.position()).toEqual({ x: 7, y: 9 });
    expect(graphic.visible()).toBe(false);
    view.set({ mode: "active-page", activePageId: 1 });
    expect(graphic.visible()).toBe(false);
  });

  it("removes wrapper offsets during capture and restores them on success or throw", () => {
    const { view, content, graphic } = populate();
    view.set({
      mode: "vertical-pages",
      activePageId: 2,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    expect(view.withUnfiltered(() => graphic.getParent())).toBe(content);
    expect(graphic.getAbsolutePosition()).toEqual({ x: 7, y: 169 });
    expect(() =>
      view.withUnfiltered(() => {
        expect(graphic.getParent()).toBe(content);
        throw new Error("capture");
      }),
    ).toThrow("capture");
    expect(graphic.getAbsolutePosition()).toEqual({ x: 7, y: 169 });
  });

  it("clears presented bounds and camera clamping for an empty scene", () => {
    const { view, context } = populate();
    view.set({ mode: "vertical-pages", activePageId: null, pages: [] });
    expect(view.getBounds(1)).toBeNull();
    expect(context.camera.clearPageSize).toHaveBeenCalled();
  });
});
