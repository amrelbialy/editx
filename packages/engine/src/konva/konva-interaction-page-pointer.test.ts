import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { KonvaCamera } from "./konva-camera";
import { setupInteraction } from "./konva-interaction-handler";

function setup(mode = "vertical-pages", enabled = true) {
  const handlers = new Map<string, (event: unknown) => void>();
  const container = { addEventListener: vi.fn(), getBoundingClientRect: () => ({}) };
  const stage = {
    on: vi.fn((events: string, handler: (event: unknown) => void) => handlers.set(events, handler)),
    container: () => container,
    getPointerPosition: () => ({ x: 110, y: 220 }),
    getAttr: () => undefined,
    getParent: () => null,
  } as unknown as Konva.Stage;
  const selectionRect = new Konva.Rect({ visible: false });
  const wrapper = new Konva.Group({ x: 100, y: 200 });
  wrapper.setAttr("pageViewPageId", 7);
  const page = new Konva.Group();
  page.setAttrs({ blockId: 7, isPage: true });
  const background = new Konva.Rect({ isPageBackground: true });
  page.add(background);
  const artwork = new Konva.Rect({ width: 100, height: 80, blockId: 9 });
  wrapper.add(page, artwork);
  const order: string[] = [];
  setupInteraction({
    stage,
    selectionRect,
    uiLayer: { batchDraw: vi.fn() } as unknown as Konva.Layer,
    transformer: { nodes: () => [] } as unknown as Konva.Transformer,
    nodeMap: new Map([[9, artwork]]),
    camera: { screenToWorld: vi.fn((point) => point) } as unknown as KonvaCamera,
    getGroupContext: () => [],
    getPageViewMode: () => mode,
    getActivePageId: () => 7,
    isInteractionEnabled: () => enabled,
    callbacks: {
      onPagePointerDown: (id) => order.push(`page:${id}`),
      onBlockClick: (id) => order.push(`block:${id}`),
      onStageClick: () => order.push("stage"),
      getOwningPageId: () => 7,
    },
  });
  return { handlers, artwork, background, selectionRect, order, stage };
}

describe("continuous page pointer activation", () => {
  it.each([
    "vertical-pages",
    "horizontal-pages",
  ])("%s activates once before click handling, not again at completion", (mode) => {
    const { handlers, artwork, order } = setup(mode);
    handlers.get("mousedown touchstart")?.({ target: artwork, evt: { button: 0 } });
    expect(order).toEqual(["page:7"]);
    handlers.get("click tap")?.({ target: artwork, evt: { button: 0 } });
    expect(order).toEqual(["page:7", "block:9"]);
  });

  it("activates backgrounds before starting a marquee", () => {
    const { handlers, background, selectionRect, order } = setup();
    handlers.get("mousedown touchstart")?.({ target: background, evt: { button: 0 } });
    expect(order).toEqual(["page:7"]);
    expect(selectionRect.visible()).toBe(true);
  });

  it.each([
    "vertical-pages",
    "horizontal-pages",
  ])("selects a %s background exclusively instead of clearing selection", (mode) => {
    const { handlers, background, order } = setup(mode);
    handlers.get("mousedown touchstart")?.({ target: background, evt: { button: 0 } });
    handlers.get("click tap")?.({
      target: background,
      evt: { button: 0, shiftKey: true, ctrlKey: true },
    });

    expect(order).toEqual(["page:7", "block:7"]);
  });

  it.each(["all-pages", "active-page"])("keeps legacy background deselection in %s", (mode) => {
    const { handlers, background, order } = setup(mode);
    handlers.get("click tap")?.({ target: background, evt: { button: 0 } });
    expect(order).toEqual(["stage"]);
  });

  it("supports single-contact touch and primary pen starts", () => {
    const { handlers, artwork, order } = setup();
    handlers.get("mousedown touchstart")?.({ target: artwork, evt: { touches: [{}] } });
    handlers.get("mousedown touchstart")?.({
      target: artwork,
      evt: { button: 0, pointerType: "pen", isPrimary: true },
    });
    expect(order).toEqual(["page:7", "page:7"]);
  });

  it("does not activate for a synthetic click, transformer handle, or inter-page start", () => {
    const { handlers, artwork, order, stage } = setup();
    handlers.get("click tap")?.({ target: artwork, evt: { button: 0 } });
    expect(order).toEqual(["block:9"]);
    order.length = 0;
    const handle = new Konva.Rect();
    handlers.get("mousedown touchstart")?.({ target: handle, evt: { button: 0 } });
    handlers.get("mousedown touchstart")?.({ target: stage, evt: { button: 0 } });
    expect(order).toEqual([]);
  });

  it.each([
    { button: 1 },
    { button: 2 },
    { button: 0, isPrimary: false },
    { touches: [{}, {}] },
  ])("ignores camera/nonprimary contacts %j", (evt) => {
    const { handlers, background, selectionRect, order } = setup();
    handlers.get("mousedown touchstart")?.({ target: background, evt });
    handlers.get("click tap")?.({ target: background, evt });
    expect(order).toEqual([]);
    expect(selectionRect.visible()).toBe(false);
  });

  it.each(["all-pages", "active-page"])("does not activate in %s", (mode) => {
    const { handlers, artwork, order } = setup(mode);
    handlers.get("mousedown touchstart")?.({ target: artwork, evt: { button: 0 } });
    expect(order).toEqual([]);
  });

  it("does not activate through disabled editing interactions", () => {
    const { handlers, background, selectionRect, order } = setup("vertical-pages", false);
    handlers.get("mousedown touchstart")?.({ target: background, evt: { button: 0 } });
    handlers.get("click tap")?.({ target: background, evt: { button: 0 } });
    expect(order).toEqual([]);
    expect(selectionRect.visible()).toBe(false);
  });
});
