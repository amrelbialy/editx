/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { EFFECT_ADJUSTMENTS_BRIGHTNESS } from "../block/property-keys";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

const { applyFilterChainMock } = vi.hoisted(() => ({ applyFilterChainMock: vi.fn() }));
vi.mock("./filters/cpu-chain", () => ({
  applyFilterChain: applyFilterChainMock,
  createPresetFilter: vi.fn(() => vi.fn()),
}));

import {
  processImageSource,
  type ResolvedImageEffects,
  resolveImageEffects,
} from "./konva-image-effects";

interface CanvasDouble {
  canvas: HTMLCanvasElement;
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
}

function makeCanvas(width = 4, height = 3): CanvasDouble {
  const imageData = { data: new Uint8ClampedArray(width * height * 4), width, height } as ImageData;
  const clearRect = vi.fn();
  const drawImage = vi.fn();
  const getImageData = vi.fn(() => imageData);
  const putImageData = vi.fn();
  const canvas = {
    width,
    height,
    getContext: () => ({ clearRect, drawImage, getImageData, putImageData }),
  } as unknown as HTMLCanvasElement;
  return { canvas, clearRect, drawImage, getImageData, putImageData };
}

function effects(overrides: Partial<ResolvedImageEffects> = {}): ResolvedImageEffects {
  return {
    values: {
      brightness: 0.2,
      saturation: 0,
      contrast: 0,
      gamma: 0,
      clarity: 0,
      exposure: 0,
      shadows: 0,
      highlights: 0,
      blacks: 0,
      whites: 0,
      temperature: 0,
      sharpness: 0,
    },
    presetName: "",
    hasEffective: true,
    key: "brightness-0.2",
    ...overrides,
  };
}

const source = {
  naturalWidth: 4,
  naturalHeight: 3,
  width: 4,
  height: 3,
} as HTMLImageElement;

beforeEach(() => {
  applyFilterChainMock.mockReset();
});

describe("processImageSource", () => {
  it("returns the immutable raw source when no effect is effective", () => {
    const owned = makeCanvas();

    const result = processImageSource(
      source,
      effects({ values: null, hasEffective: false, key: "|" }),
      null,
      owned.canvas,
    );

    expect(result).toBe(source);
    expect(owned.drawImage).not.toHaveBeenCalled();
    expect(applyFilterChainMock).not.toHaveBeenCalled();
  });

  it("reuses a source-sized owned canvas for the CPU chain", () => {
    const owned = makeCanvas();

    const result = processImageSource(source, effects(), null, owned.canvas);

    expect(result).toBe(owned.canvas);
    expect(owned.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(owned.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
    expect(applyFilterChainMock).toHaveBeenCalledOnce();
    expect(owned.putImageData).toHaveBeenCalledOnce();
  });

  it("copies shared WebGL output immediately into the owned canvas", () => {
    const owned = makeCanvas();
    const sharedCanvas = makeCanvas().canvas;
    const webgl = {
      uploadImage: vi.fn(),
      render: vi.fn(() => sharedCanvas),
    } as unknown as WebGLFilterRenderer;

    const result = processImageSource(source, effects(), webgl, owned.canvas);

    expect(result).toBe(owned.canvas);
    expect(result).not.toBe(sharedCanvas);
    expect(webgl.uploadImage).toHaveBeenCalledWith(source, 4, 3);
    expect(owned.drawImage).toHaveBeenCalledWith(sharedCanvas, 0, 0);
    expect(applyFilterChainMock).not.toHaveBeenCalled();
  });
});

describe("resolveImageEffects", () => {
  it("changes the effective key when an owned adjustment sub-block changes", () => {
    const adjustment = {
      id: 2,
      type: "effect",
      kind: "adjustments",
      name: "Adjustments",
      fillId: null,
      effectIds: [],
      properties: { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.2 },
    } as BlockData;
    const graphic = {
      id: 1,
      type: "graphic",
      kind: "rect",
      name: "Graphic",
      fillId: null,
      effectIds: [adjustment.id],
      properties: {},
    } as BlockData;
    const resolve = (id: number) => (id === adjustment.id ? adjustment : undefined);
    const firstKey = resolveImageEffects(graphic, resolve).key;

    adjustment.properties[EFFECT_ADJUSTMENTS_BRIGHTNESS] = 0.7;

    expect(resolveImageEffects(graphic, resolve).key).not.toBe(firstKey);
  });
});
