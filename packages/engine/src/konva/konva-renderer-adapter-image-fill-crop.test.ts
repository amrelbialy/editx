import Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import type { ImageFillCrop } from "../editor-types";

const scene = vi.hoisted(() => {
  const layer = () => ({ add: vi.fn(), batchDraw: vi.fn() });
  const uiLayer = layer();
  const transformer = {
    nodes: vi.fn((): unknown[] => []),
    moveToTop: vi.fn(),
    forceUpdate: vi.fn(),
    getLayer: vi.fn(() => uiLayer),
    enabledAnchors: vi.fn(),
    keepRatio: vi.fn(),
    flipEnabled: vi.fn(),
  };
  const cropOverlay = {
    showBlock: vi.fn(),
    refreshBlock: vi.fn(),
    setBlockFrame: vi.fn(),
    containsBlockPoint: vi.fn(() => false),
    setRatio: vi.fn(),
    hide: vi.fn(),
    destroy: vi.fn(),
    isBlockMode: vi.fn(() => false),
  };
  const selectionRect = { visible: vi.fn() };
  return {
    interactionCallbacks: null as null | {
      onBlockClick?: (
        blockId: number,
        event: { shiftKey: boolean; insideContext: boolean },
      ) => void;
    },
    contentLayer: layer(),
    uiLayer,
    stage: {
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getPointerPosition: vi.fn(() => null),
      container: vi.fn(() => ({ style: { cursor: "" } })),
    },
    transformer,
    cropOverlay,
    selectionRect,
    camera: { setPanChangeListener: vi.fn() },
    nodeFactory: { createNode: vi.fn(), updateNode: vi.fn() },
  };
});

vi.mock("./konva-scene-setup", () => ({
  createKonvaScene: vi.fn((_root, _width, _height, _nodeMap, callbacks) => {
    scene.interactionCallbacks = callbacks;
    return {
      ...scene,
      updateAccentColor: vi.fn(),
      webgl: null,
    };
  }),
}));

import { KonvaRendererAdapter } from "./konva-renderer-adapter";

const realResizeObserver = globalThis.ResizeObserver;
class NoopResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

const INITIAL: ImageFillCrop = {
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  mode: "crop",
  alignment: "center",
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 90,
  flipHorizontal: false,
  flipVertical: false,
};

async function setup() {
  const adapter = new KonvaRendererAdapter();
  await adapter.init({} as HTMLElement);
  await adapter.createScene({ properties: {} } as BlockData, { properties: {} } as BlockData);
  const node = new Konva.Rect({ width: 200, height: 100 });
  node.setAttr("__fillPatternSource", { width: 400, height: 400 });
  scene.nodeFactory.createNode.mockReturnValueOnce(node);
  adapter.syncBlock(7, { type: "graphic", kind: "rect" } as BlockData);
  new Konva.Group().add(node);
  return { adapter, node };
}

describe("KonvaRendererAdapter image-fill crop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver = NoopResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = realResizeObserver;
  });

  it("uses the crop overlay and consumes frame transforms as preview changes", async () => {
    const { adapter, node } = await setup();
    const onDocumentTransform = vi.fn();
    const onPreviewChange = vi.fn();
    adapter.onBlockTransformEnd = onDocumentTransform;
    adapter.onImageFillCropPreviewChange = onPreviewChange;

    expect(adapter.showImageFillCropPreview(7, INITIAL)).toMatchObject(INITIAL);
    const callbacks = scene.nodeFactory.createNode.mock.calls[0]?.[2] as {
      onTransformEnd: (id: number, transform: import("../render-adapter").BlockTransform) => void;
    };
    callbacks.onTransformEnd(7, { x: 30, y: 40, width: 120, height: 80, rotation: 15 });

    expect(scene.transformer.nodes).toHaveBeenLastCalledWith([]);
    expect(scene.selectionRect.visible).toHaveBeenCalledWith(false);
    expect(scene.cropOverlay.showBlock).toHaveBeenCalledWith(
      expect.any(Konva.Rect),
      expect.objectContaining({
        onStart: expect.any(Function),
        onChange: expect.any(Function),
        onEnd: expect.any(Function),
      }),
    );
    const preview = scene.cropOverlay.showBlock.mock.calls[0][0] as Konva.Shape;
    expect(preview).not.toBe(node);
    expect(preview.constructor).toBe(node.constructor);
    expect(node.visible()).toBe(false);
    expect(onDocumentTransform).not.toHaveBeenCalled();
    expect(onPreviewChange).toHaveBeenCalledWith(
      expect.objectContaining({ x: 30, width: 120, rotation: 90 }),
    );
  });

  it("does not reattach the shared transformer while crop is active", async () => {
    const { adapter, node } = await setup();
    adapter.showImageFillCropPreview(7, INITIAL);

    scene.transformer.nodes.mockClear();
    adapter.showTransformer([7], "graphic");

    expect(scene.transformer.nodes).toHaveBeenCalledWith([]);
    expect(scene.transformer.nodes).not.toHaveBeenCalledWith([node]);
  });

  it("does not forward normal block clicks while crop is active", async () => {
    const { adapter } = await setup();
    const onBlockClick = vi.fn();
    adapter.onBlockClick = onBlockClick;
    adapter.showImageFillCropPreview(7, INITIAL);

    scene.interactionCallbacks?.onBlockClick?.(7, { shiftKey: false, insideContext: true });

    expect(onBlockClick).not.toHaveBeenCalled();
  });

  it("forwards a dimmed-area click as crop dismissal", async () => {
    const { adapter } = await setup();
    const onDismiss = vi.fn();
    adapter.onImageFillCropDismiss = onDismiss;
    adapter.showImageFillCropPreview(7, INITIAL);
    const clickCall = scene.stage.on.mock.calls.find(([events]) =>
      String(events).includes("click.imageFillCrop"),
    );

    clickCall?.[1]({ target: new Konva.Rect(), cancelBubble: false });

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
