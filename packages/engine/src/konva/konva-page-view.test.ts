import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { PAGE_HEIGHT, PAGE_WIDTH, VISIBLE } from "../block/property-keys";
import { KonvaPageView } from "./konva-page-view";
import { KonvaRendererContext } from "./konva-renderer-context";

function block(
  id: number,
  type: BlockData["type"],
  parentId: number | null,
  properties: BlockData["properties"] = {},
): BlockData {
  return { id, type, parentId, children: [], properties, kind: "" } as BlockData;
}

function setup() {
  const blocks = new Map<number, BlockData>();
  const context = new KonvaRendererContext({ resolveBlock: (id) => blocks.get(id) });
  context.contentLayer = { batchDraw: vi.fn() } as unknown as Konva.Layer;
  context.uiLayer = { batchDraw: vi.fn() } as unknown as Konva.Layer;
  context.camera = { setPageSize: vi.fn() } as never;
  context.transformer = {
    nodes: vi.fn((nodes?: Konva.Node[]) => nodes ?? []),
  } as unknown as Konva.Transformer;
  const view = new KonvaPageView(context);
  return { blocks, context, view };
}

describe("KonvaPageView", () => {
  it("filters page backgrounds and flat/nested descendants by document ancestry", () => {
    const { blocks, context, view } = setup();
    const page1 = block(1, "page", 10);
    const page2 = block(2, "page", 10);
    const flat1 = block(3, "graphic", 1);
    const group2 = block(4, "group", 2);
    const nested2 = block(5, "text", 4);
    for (const item of [page1, page2, flat1, group2, nested2]) blocks.set(item.id, item);
    for (const item of blocks.values()) {
      const node = new Konva.Group({ visible: true });
      context.nodeMap.set(item.id, node);
      view.recordNodeSync(item.id, node);
    }

    view.set({ mode: "active-page", activePageId: 1 });

    expect(context.nodeMap.get(1)?.isVisible()).toBe(true);
    expect(context.nodeMap.get(3)?.isVisible()).toBe(true);
    expect(context.nodeMap.get(2)?.isVisible()).toBe(false);
    expect(context.nodeMap.get(4)?.isVisible()).toBe(false);
    expect(context.nodeMap.get(5)?.isVisible()).toBe(false);
  });

  it("restores authored visibility without forcing hidden groups or preview state visible", () => {
    const { blocks, context, view } = setup();
    const page1 = block(1, "page", 10);
    const page2 = block(2, "page", 10);
    const hidden = block(3, "group", 2, { [VISIBLE]: false });
    for (const item of [page1, page2, hidden]) blocks.set(item.id, item);
    const page1Node = new Konva.Group();
    const page2Node = new Konva.Group();
    const hiddenNode = new Konva.Group({ visible: false });
    context.nodeMap.set(1, page1Node);
    context.nodeMap.set(2, page2Node);
    context.nodeMap.set(3, hiddenNode);
    view.recordNodeSync(1, page1Node);
    view.recordNodeSync(2, page2Node);
    view.recordNodeSync(3, hiddenNode);

    view.set({ mode: "active-page", activePageId: 1 });
    view.set({ mode: "all-pages" });

    expect(page2Node.visible()).toBe(true);
    expect(hiddenNode.visible()).toBe(false);

    hiddenNode.visible(false);
    view.recordNodeSync(3, hiddenNode);
    expect(hiddenNode.visible()).toBe(false);
  });

  it("uses only active dimensions while isolated and restores last legacy dimensions", () => {
    const { blocks, context, view } = setup();
    const first = block(1, "page", 10, { [PAGE_WIDTH]: 100, [PAGE_HEIGHT]: 80 });
    const second = block(2, "page", 10, { [PAGE_WIDTH]: 300, [PAGE_HEIGHT]: 200 });
    blocks.set(1, first);
    blocks.set(2, second);
    view.initialize(first);
    view.recordPage(second);
    expect(context.lastPageSize).toEqual({ width: 300, height: 200 });

    view.set({ mode: "active-page", activePageId: 1 });
    expect(context.lastPageSize).toEqual({ width: 100, height: 80 });
    const changedSecond = block(2, "page", 10, { [PAGE_WIDTH]: 600, [PAGE_HEIGHT]: 400 });
    blocks.set(2, changedSecond);
    view.recordPage(changedSecond);
    expect(context.lastPageSize).toEqual({ width: 100, height: 80 });

    view.set({ mode: "all-pages" });
    expect(context.lastPageSize).toEqual({ width: 600, height: 400 });
    expect(context.camera.setPageSize).toHaveBeenLastCalledWith(600, 400);
  });

  it("temporarily unfilters capture and restores isolation synchronously", () => {
    const { blocks, context, view } = setup();
    blocks.set(1, block(1, "page", 10));
    blocks.set(2, block(2, "page", 10));
    const hiddenPage = new Konva.Group();
    context.nodeMap.set(2, hiddenPage);
    view.recordNodeSync(2, hiddenPage);
    view.set({ mode: "active-page", activePageId: 1 });

    const visibleDuringCapture = view.withUnfiltered(() => hiddenPage.visible());

    expect(visibleDuringCapture).toBe(true);
    expect(hiddenPage.visible()).toBe(false);
  });

  it("reapplies after node sync and ancestry changes", () => {
    const { blocks, context, view } = setup();
    blocks.set(1, block(1, "page", 10));
    blocks.set(2, block(2, "page", 10));
    blocks.set(3, block(3, "graphic", 2));
    const node = new Konva.Rect();
    context.nodeMap.set(3, node);
    view.recordNodeSync(3, node);
    view.set({ mode: "active-page", activePageId: 1 });
    expect(node.visible()).toBe(false);

    node.visible(true);
    view.recordNodeSync(3, node);
    expect(node.visible()).toBe(false);

    blocks.set(3, block(3, "graphic", 1));
    view.apply();
    expect(node.visible()).toBe(true);
  });

  it("keeps the isolated page background behind its flat authored children", () => {
    const { blocks, context, view } = setup();
    const scene = block(10, "scene", null);
    scene.children = [1, 2];
    blocks.set(10, scene);
    blocks.set(1, block(1, "page", 10));
    blocks.set(2, block(2, "page", 10));
    blocks.set(3, block(3, "graphic", 1));
    blocks.set(4, block(4, "graphic", 2));
    const content = new Konva.Group();
    const page1 = new Konva.Group();
    const graphic1 = new Konva.Rect();
    const page2 = new Konva.Group();
    const graphic2 = new Konva.Rect();
    content.add(page1, graphic1, page2, graphic2);
    context.nodeMap.set(1, page1);
    context.nodeMap.set(2, page2);
    context.nodeMap.set(3, graphic1);
    context.nodeMap.set(4, graphic2);
    page1.moveToTop();
    page2.moveToTop();

    view.set({ mode: "active-page", activePageId: 1 });
    expect(page1.zIndex()).toBeLessThan(graphic1.zIndex());

    const legacyOrderDuringExport = view.withUnfiltered(() => ({
      graphic: graphic1.zIndex(),
      page: page1.zIndex(),
    }));
    expect(legacyOrderDuringExport.page).toBeGreaterThan(legacyOrderDuringExport.graphic);
    expect(page1.zIndex()).toBeLessThan(graphic1.zIndex());

    view.set({ mode: "all-pages" });
    expect(page1.zIndex()).toBeGreaterThan(graphic1.zIndex());
    expect(page2.zIndex()).toBeGreaterThan(graphic2.zIndex());
  });
});
