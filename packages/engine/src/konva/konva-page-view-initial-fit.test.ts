import Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";

const createScene = vi.hoisted(() => vi.fn());
vi.mock("./konva-scene-setup", () => ({ createKonvaScene: createScene }));

import { KonvaRendererAdapter } from "./konva-renderer-adapter";

class ControlledResizeObserver {
  static callback: (() => void) | null = null;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: ResizeObserverCallback) {
    ControlledResizeObserver.callback = () => callback([], this as unknown as ResizeObserver);
  }
}

const originalResizeObserver = globalThis.ResizeObserver;

function page(id: number, width: number, height: number): BlockData {
  return {
    id,
    type: "page",
    kind: "",
    parentId: 10,
    children: [],
    properties: { "page/width": width, "page/height": height },
  } as BlockData;
}

describe("continuous page-view scene restoration", () => {
  const fitToRect = vi.fn();
  const fitToScreen = vi.fn();
  const reapplyViewport = vi.fn();
  const cameraDispose = vi.fn();
  let stageWidth = 800;
  let stageHeight = 600;

  beforeEach(() => {
    stageWidth = 800;
    stageHeight = 600;
    globalThis.ResizeObserver =
      ControlledResizeObserver as unknown as typeof globalThis.ResizeObserver;
    const contentLayer = new Konva.Group();
    const uiLayer = new Konva.Group();
    contentLayer.batchDraw = () => contentLayer;
    uiLayer.batchDraw = () => uiLayer;
    const transformer = new Konva.Transformer();
    uiLayer.add(transformer);
    const camera = {
      setPanChangeListener: vi.fn(),
      setPageSize: vi.fn(),
      setPageNavigationBounds: vi.fn(() => true),
      reapplyViewport,
      fitToRect,
      fitToScreen,
      getZoom: vi.fn(() => 1),
      dispose: cameraDispose,
    };
    const cropOverlay = {
      refreshBlock: vi.fn(),
      isVisible: vi.fn(() => false),
      isBlockMode: vi.fn(() => false),
      hide: vi.fn(),
      destroy: vi.fn(),
    };
    createScene.mockImplementation(() => {
      const stage = new Konva.Group({ width: stageWidth, height: stageHeight });
      return {
        stage,
        contentLayer,
        uiLayer,
        transformer,
        updateAccentColor: vi.fn(),
        selectionRect: new Konva.Rect(),
        camera,
        nodeFactory: {},
        cropOverlay,
        webgl: null,
      };
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    ControlledResizeObserver.callback = null;
    vi.clearAllMocks();
  });

  it("fits the restored active frame, then preserves it on the first resize", async () => {
    const adapter = new KonvaRendererAdapter();
    adapter.setPageView({
      mode: "vertical-pages",
      activePageId: 2,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    await adapter.init({ clientWidth: 800, clientHeight: 600 } as HTMLElement);
    await adapter.createScene(page(10, 100, 80), page(1, 100, 80));

    expect(fitToRect).toHaveBeenCalledWith({ x: 0, y: 160, width: 200, height: 120 }, 48);
    expect(fitToScreen).not.toHaveBeenCalled();
    fitToRect.mockClear();
    reapplyViewport.mockClear();

    ControlledResizeObserver.callback?.();

    expect(fitToRect).not.toHaveBeenCalled();
    expect(fitToScreen).not.toHaveBeenCalled();
    expect(reapplyViewport).toHaveBeenCalledTimes(1);
    adapter.dispose();
  });

  it("defers the active-frame fit until a hidden viewport first becomes visible", async () => {
    stageWidth = 0;
    stageHeight = 0;
    const root = { clientWidth: 0, clientHeight: 0 };
    const adapter = new KonvaRendererAdapter();
    await adapter.init(root as HTMLElement);
    await adapter.createScene(page(10, 100, 80), page(1, 100, 80));
    expect(fitToRect).not.toHaveBeenCalled();
    expect(fitToScreen).not.toHaveBeenCalled();
    adapter.setPageView({
      mode: "vertical-pages",
      activePageId: 1,
      pages: [
        { id: 1, width: 100, height: 80 },
        { id: 2, width: 200, height: 120 },
      ],
    });
    adapter.setPageView({
      mode: "horizontal-pages",
      activePageId: 2,
      pages: [
        { id: 1, width: 300, height: 100 },
        { id: 2, width: 150, height: 200 },
      ],
    });
    reapplyViewport.mockClear();

    root.clientWidth = 800;
    root.clientHeight = 600;
    ControlledResizeObserver.callback?.();
    ControlledResizeObserver.callback?.();

    expect(fitToRect).toHaveBeenCalledTimes(1);
    expect(fitToRect).toHaveBeenCalledWith({ x: 380, y: 0, width: 150, height: 200 }, 48);
    expect(fitToScreen).not.toHaveBeenCalled();
    expect(reapplyViewport).toHaveBeenCalledTimes(1);
    adapter.dispose();
  });

  it("resolves a hidden active-page opt-in when the viewport becomes visible", async () => {
    stageWidth = 0;
    stageHeight = 0;
    const root = { clientWidth: 0, clientHeight: 0 };
    const adapter = new KonvaRendererAdapter();
    await adapter.init(root as HTMLElement);
    await adapter.createScene(page(10, 100, 80), page(1, 100, 80));
    adapter.setPageView({ mode: "active-page", activePageId: 1 });

    root.clientWidth = 800;
    root.clientHeight = 600;
    ControlledResizeObserver.callback?.();

    expect(fitToRect).toHaveBeenCalledWith({ x: 0, y: 0, width: 100, height: 80 }, 48);
    expect(fitToScreen).not.toHaveBeenCalled();
    adapter.dispose();
  });

  it("disposes the old camera on scene replacement and final teardown", async () => {
    const adapter = new KonvaRendererAdapter();
    await adapter.init({ clientWidth: 800, clientHeight: 600 } as HTMLElement);
    await adapter.createScene(page(10, 100, 80), page(1, 100, 80));
    await adapter.createScene(page(10, 100, 80), page(1, 100, 80));
    expect(cameraDispose).toHaveBeenCalledTimes(1);

    adapter.dispose();
    expect(cameraDispose).toHaveBeenCalledTimes(2);
  });
});
