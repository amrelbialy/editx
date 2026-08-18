/**
 * @vitest-environment node
 */

import type Konva from "konva";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { FILL_IMAGE_SRC, FILL_SOLID_COLOR } from "../block/property-keys";
import { applyShapeFillStroke } from "./konva-fill";

const { loadImageMock, processImageSourceMock, resolveImageEffectsMock } = vi.hoisted(() => ({
  loadImageMock: vi.fn(),
  processImageSourceMock: vi.fn(),
  resolveImageEffectsMock: vi.fn(),
}));
vi.mock("../utils/image-loader", () => ({ loadImage: loadImageMock }));
vi.mock("./konva-image-effects", () => ({
  processImageSource: processImageSourceMock,
  resolveImageEffects: resolveImageEffectsMock,
}));

interface ShapeDouble {
  node: Konva.Rect;
  attrs: Map<string, unknown>;
  fillPatternImage: ReturnType<typeof vi.fn>;
  setAttached: (attached: boolean) => void;
}

function makeShape(): ShapeDouble {
  const attrs = new Map<string, unknown>();
  const fillPatternImage = vi.fn();
  let attached = true;
  const node = {
    fillEnabled: vi.fn(),
    fillPriority: vi.fn(),
    fillPatternRepeat: vi.fn(),
    fillPatternOffset: vi.fn(),
    fillPatternRotation: vi.fn(),
    fillPatternX: vi.fn(),
    fillPatternY: vi.fn(),
    fillPatternImage,
    fillPatternScale: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeWidth: vi.fn(),
    strokeLinearGradientColorStops: vi.fn(),
    shadowEnabled: vi.fn(),
    getAttr: (key: string) => attrs.get(key),
    setAttr: (key: string, value: unknown) => attrs.set(key, value),
    getStage: () => (attached ? {} : null),
    getLayer: () => ({ batchDraw: vi.fn() }),
  } as unknown as Konva.Rect;
  return { node, attrs, fillPatternImage, setAttached: (value) => (attached = value) };
}

function blocks(src = "photo.png") {
  const imageFill = {
    id: 2,
    type: "fill",
    kind: "image",
    name: "Image fill",
    fillId: null,
    effectIds: [],
    properties: { [FILL_IMAGE_SRC]: src },
  } as BlockData;
  const colorFill = {
    id: 3,
    type: "fill",
    kind: "color",
    name: "Color fill",
    fillId: null,
    effectIds: [],
    properties: { [FILL_SOLID_COLOR]: { r: 1, g: 0, b: 0, a: 1 } },
  } as BlockData;
  const graphic = {
    id: 1,
    type: "graphic",
    kind: "rect",
    name: "Graphic",
    fillId: imageFill.id,
    effectIds: [4],
    properties: {},
  } as BlockData;
  const resolve = (id: number) => {
    if (id === imageFill.id) return imageFill;
    if (id === colorFill.id) return colorFill;
    return undefined;
  };
  return { imageFill, colorFill, graphic, resolve };
}

beforeEach(() => {
  loadImageMock.mockReset();
  processImageSourceMock.mockReset();
  resolveImageEffectsMock.mockReset();
  resolveImageEffectsMock.mockReturnValue({
    values: null,
    presetName: "Sepia",
    hasEffective: true,
    key: "|Sepia",
  });
});

describe("graphic image fill effects", () => {
  it("stores raw and processed sources separately and caches by source plus effect key", async () => {
    const raw = { width: 10, height: 5 } as HTMLImageElement;
    const processed = { width: 10, height: 5 } as HTMLCanvasElement;
    const shape = makeShape();
    const { graphic, resolve } = blocks();
    loadImageMock.mockResolvedValue(raw);
    processImageSourceMock.mockImplementation((_source, effects: { hasEffective: boolean }) =>
      effects.hasEffective ? processed : raw,
    );

    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    await shape.attrs.get("__fillImageReady");

    expect(shape.attrs.get("__fillSourceImage")).toBe(raw);
    expect(shape.attrs.get("__fillProcessedImage")).toBe(processed);
    expect(shape.fillPatternImage).toHaveBeenLastCalledWith(processed);
    expect(processImageSourceMock).toHaveBeenCalledOnce();

    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    expect(processImageSourceMock).toHaveBeenCalledOnce();

    resolveImageEffectsMock.mockReturnValue({
      values: null,
      presetName: "Invert",
      hasEffective: true,
      key: "|Invert",
    });
    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    expect(processImageSourceMock).toHaveBeenCalledTimes(2);
    expect(processImageSourceMock.mock.calls[1]?.[0]).toBe(raw);

    resolveImageEffectsMock.mockReturnValue({
      values: null,
      presetName: "",
      hasEffective: false,
      key: "|",
    });
    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    resolveImageEffectsMock.mockReturnValue({
      values: null,
      presetName: "Sepia",
      hasEffective: true,
      key: "|Sepia",
    });
    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    expect(processImageSourceMock.mock.calls[3]?.[3]).toBe(processed);
  });

  it("does not apply a stale load after the fill switches away from image", async () => {
    let resolveLoad: ((source: HTMLImageElement) => void) | undefined;
    loadImageMock.mockReturnValue(
      new Promise<HTMLImageElement>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const shape = makeShape();
    const { colorFill, graphic, resolve } = blocks();
    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    const ready = shape.attrs.get("__fillImageReady") as Promise<void>;

    graphic.fillId = colorFill.id;
    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    shape.fillPatternImage.mockClear();
    resolveLoad?.({ width: 10, height: 5 } as HTMLImageElement);
    await ready;

    expect(shape.fillPatternImage).not.toHaveBeenCalled();
    expect(processImageSourceMock).not.toHaveBeenCalled();
  });

  it("does not let a pending source overwrite a restored cached source", async () => {
    const sourceA = { width: 10, height: 5, src: "a.png" } as HTMLImageElement;
    const sourceB = { width: 20, height: 10, src: "b.png" } as HTMLImageElement;
    let resolveSourceB: ((source: HTMLImageElement) => void) | undefined;
    loadImageMock.mockResolvedValueOnce(sourceA).mockReturnValueOnce(
      new Promise<HTMLImageElement>((resolve) => {
        resolveSourceB = resolve;
      }),
    );
    processImageSourceMock.mockImplementation((source) => source);
    const shape = makeShape();
    const { imageFill, graphic, resolve } = blocks("a.png");
    const box = { x: 0, y: 0, width: 20, height: 20 };

    applyShapeFillStroke(shape.node, {}, box, graphic, resolve);
    await shape.attrs.get("__fillImageReady");

    imageFill.properties[FILL_IMAGE_SRC] = "b.png";
    applyShapeFillStroke(shape.node, {}, box, graphic, resolve);
    const pendingSourceB = shape.attrs.get("__fillImageReady") as Promise<void>;

    imageFill.properties[FILL_IMAGE_SRC] = "a.png";
    applyShapeFillStroke(shape.node, {}, box, graphic, resolve);
    expect(shape.fillPatternImage).toHaveBeenLastCalledWith(sourceA);

    resolveSourceB?.(sourceB);
    await pendingSourceB;

    expect(shape.fillPatternImage).toHaveBeenLastCalledWith(sourceA);
    expect(shape.attrs.get("__fillSourceImage")).toBe(sourceA);
  });

  it("does not apply a completed load to a detached shape", async () => {
    const raw = { width: 10, height: 5 } as HTMLImageElement;
    const shape = makeShape();
    const { graphic, resolve } = blocks();
    loadImageMock.mockResolvedValue(raw);
    shape.setAttached(false);

    applyShapeFillStroke(shape.node, {}, { x: 0, y: 0, width: 20, height: 20 }, graphic, resolve);
    await shape.attrs.get("__fillImageReady");

    expect(shape.fillPatternImage).not.toHaveBeenCalled();
    expect(shape.attrs.get("__fillSourceImage")).toBeUndefined();
  });
});
