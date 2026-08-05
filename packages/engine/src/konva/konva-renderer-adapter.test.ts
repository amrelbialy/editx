import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import type { CropRect } from "../utils/crop-math";

/**
 * WI-6: redraws must be scoped and batched. `renderFrame` batch-draws only the
 * affected layers (never a synchronous full-stage `stage.draw()`), and
 * `showCropOverlay` batch-draws the content layer rather than the whole stage.
 *
 * The adapter's Konva scene is stubbed via a mocked `createKonvaScene` so the
 * batching behaviour can be asserted without a real canvas backend.
 */

const scene = vi.hoisted(() => {
  const layer = () => ({ add: vi.fn(), batchDraw: vi.fn() });
  const contentLayer = layer();
  const uiLayer = layer();
  const stage = { batchDraw: vi.fn(), draw: vi.fn(), destroy: vi.fn() };
  const transformer = { nodes: vi.fn(), moveToTop: vi.fn() };
  const camera = { setPanChangeListener: vi.fn(), getZoom: vi.fn(() => 1.5), setPageSize: vi.fn() };
  const cropOverlay = {
    applyViewportScale: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    destroy: vi.fn(),
  };
  return { contentLayer, uiLayer, stage, transformer, camera, cropOverlay };
});

vi.mock("./konva-scene-setup", () => ({
  createKonvaScene: vi.fn(() => ({
    stage: scene.stage,
    contentLayer: scene.contentLayer,
    uiLayer: scene.uiLayer,
    transformer: scene.transformer,
    updateAccentColor: vi.fn(),
    selectionRect: {},
    camera: scene.camera,
    nodeFactory: {},
    cropOverlay: scene.cropOverlay,
    webgl: null,
  })),
}));

import { KonvaRendererAdapter } from "./konva-renderer-adapter";

const realResizeObserver = globalThis.ResizeObserver;
class NoopResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

function pageBlock(): BlockData {
  return { properties: {} } as unknown as BlockData;
}

async function makeAdapter() {
  const adapter = new KonvaRendererAdapter();
  await adapter.init({} as unknown as HTMLElement);
  await adapter.createScene(pageBlock(), pageBlock());
  return adapter;
}

describe("KonvaRendererAdapter scoped/batched redraws", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver = NoopResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = realResizeObserver;
  });

  it("renderFrame batch-draws only the content + UI layers (no full stage.draw)", async () => {
    const adapter = await makeAdapter();
    scene.contentLayer.batchDraw.mockClear();
    scene.uiLayer.batchDraw.mockClear();

    adapter.renderFrame();

    expect(scene.contentLayer.batchDraw).toHaveBeenCalledTimes(1);
    expect(scene.uiLayer.batchDraw).toHaveBeenCalledTimes(1);
    expect(scene.stage.draw).not.toHaveBeenCalled();
    expect(scene.stage.batchDraw).not.toHaveBeenCalled();
  });

  it("showCropOverlay uses a scoped content-layer batchDraw, not stage.batchDraw", async () => {
    const adapter = await makeAdapter();
    scene.contentLayer.batchDraw.mockClear();

    const imageRect: CropRect = { x: 0, y: 0, width: 100, height: 80 };
    adapter.showCropOverlay(7, imageRect);

    // Overlay is set up + scaled to the current zoom, and the content layer is
    // the only thing redrawn — the whole stage is never batch-drawn.
    expect(scene.cropOverlay.applyViewportScale).toHaveBeenCalledWith(1.5);
    expect(scene.cropOverlay.show).toHaveBeenCalledWith(imageRect, undefined);
    expect(scene.contentLayer.batchDraw).toHaveBeenCalledTimes(1);
    expect(scene.stage.batchDraw).not.toHaveBeenCalled();
    expect(scene.stage.draw).not.toHaveBeenCalled();
  });

  it("points the camera pan-clamp bounds at the full image rect while cropping", async () => {
    const adapter = await makeAdapter();
    scene.camera.setPageSize.mockClear();

    // Crop mode renders the full original image, so pan clamping must use those
    // bounds — otherwise fitToRect(crop) gets clamped back to the (smaller)
    // committed page size and the crop can't be centered in the viewport.
    const imageRect: CropRect = { x: 0, y: 0, width: 2000, height: 1333 };
    adapter.showCropOverlay(7, imageRect);

    expect(scene.camera.setPageSize).toHaveBeenCalledWith(2000, 1333);
  });

  it("restores the committed page size for pan clamping when cropping ends", async () => {
    const adapter = await makeAdapter();
    // createScene seeds #lastPageSize from the page block (defaults to 1080×1080).
    adapter.showCropOverlay(7, { x: 0, y: 0, width: 2000, height: 1333 });
    scene.camera.setPageSize.mockClear();

    adapter.hideCropOverlay();

    expect(scene.camera.setPageSize).toHaveBeenCalledWith(1080, 1080);
    expect(scene.cropOverlay.hide).toHaveBeenCalledTimes(1);
  });
});
