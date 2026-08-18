/**
 * @vitest-environment node
 */

import type Konva from "konva";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import {
  FILL_ENABLED,
  FILL_GRADIENT_STOPS,
  FILL_GRADIENT_TYPE,
  FILL_IMAGE_ALIGNMENT,
  FILL_IMAGE_FIT,
  FILL_IMAGE_FLIP_HORIZONTAL,
  FILL_IMAGE_ROTATION,
  FILL_IMAGE_SCALE,
  FILL_IMAGE_SRC,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_GRADIENT_ANGLE,
  STROKE_GRADIENT_ENABLED,
  STROKE_GRADIENT_STOPS,
  STROKE_WIDTH,
} from "../block/property-keys";
import { applyShapeFillStroke } from "./konva-fill";

const { loadImageMock } = vi.hoisted(() => ({ loadImageMock: vi.fn() }));
vi.mock("../utils/image-loader", () => ({ loadImage: loadImageMock }));

beforeEach(() => {
  loadImageMock.mockReset();
});

describe("applyShapeFillStroke", () => {
  it("clears an outlined circle fill while preserving its stroke", () => {
    const node = {
      fillEnabled: vi.fn(),
      fillPriority: vi.fn(),
      fillPatternImage: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      strokeLinearGradientColorStops: vi.fn(),
      shadowEnabled: vi.fn(),
    } as unknown as Konva.Ellipse;

    applyShapeFillStroke(
      node,
      {
        [FILL_ENABLED]: false,
        [STROKE_ENABLED]: true,
        [STROKE_COLOR]: { r: 0xec / 255, g: 0x48 / 255, b: 0x99 / 255, a: 1 },
        [STROKE_WIDTH]: 6,
      },
      { x: -50, y: -50, width: 100, height: 100 },
    );

    expect(node.fillEnabled).toHaveBeenCalledWith(false);
    expect(node.stroke).toHaveBeenCalledWith("#ec4899");
    expect(node.strokeWidth).toHaveBeenCalledWith(6);
  });

  it("disables Konva fill rendering when an attached gradient is hidden", () => {
    const node = {
      fillEnabled: vi.fn(),
      fillPriority: vi.fn(),
      fillPatternImage: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      strokeLinearGradientColorStops: vi.fn(),
      shadowEnabled: vi.fn(),
    } as unknown as Konva.Rect;
    const fillBlock: BlockData = {
      id: 2,
      type: "fill",
      kind: "gradient",
      name: "Gradient fill",
      fillId: null,
      effectIds: [],
      properties: {
        [FILL_GRADIENT_TYPE]: "linear",
        [FILL_GRADIENT_STOPS]: [
          { offset: 0, color: "#000000" },
          { offset: 1, color: "#ffffff" },
        ],
      },
    };
    const block = {
      id: 1,
      type: "graphic",
      kind: "rect",
      name: "Gradient shape",
      fillId: fillBlock.id,
      effectIds: [],
      properties: { [FILL_ENABLED]: false },
    } as BlockData;

    applyShapeFillStroke(
      node,
      block.properties,
      { x: 0, y: 0, width: 100, height: 100 },
      block,
      (id) => (id === fillBlock.id ? fillBlock : undefined),
    );

    expect(node.fillEnabled).toHaveBeenCalledWith(false);
  });

  it("applies a decoded image pattern, scales it, caches it, and redraws", async () => {
    const image = { width: 100, height: 50 } as HTMLImageElement;
    loadImageMock.mockResolvedValueOnce(image);
    const attrs = new Map<string, unknown>();
    const batchDraw = vi.fn();
    const node = {
      fillEnabled: vi.fn(),
      fillPriority: vi.fn(),
      fillPatternRepeat: vi.fn(),
      fillPatternOffset: vi.fn(),
      fillPatternRotation: vi.fn(),
      fillPatternX: vi.fn(),
      fillPatternY: vi.fn(),
      fillPatternImage: vi.fn(),
      fillPatternScale: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      strokeLinearGradientColorStops: vi.fn(),
      shadowEnabled: vi.fn(),
      getAttr: (key: string) => attrs.get(key),
      setAttr: (key: string, value: unknown) => attrs.set(key, value),
      getStage: () => ({}),
      getLayer: () => ({ batchDraw }),
    } as unknown as Konva.Rect;
    const fillBlock: BlockData = {
      id: 2,
      type: "fill",
      kind: "image",
      name: "Image fill",
      fillId: null,
      effectIds: [],
      properties: {
        [FILL_IMAGE_SRC]: "photo.png",
        [FILL_IMAGE_FIT]: "cover",
        [FILL_IMAGE_ALIGNMENT]: "top-left",
        [FILL_IMAGE_FLIP_HORIZONTAL]: true,
        [FILL_IMAGE_ROTATION]: 90,
        [FILL_IMAGE_SCALE]: 1.5,
      },
    };
    const block = {
      id: 1,
      type: "graphic",
      kind: "rect",
      name: "Photo box",
      fillId: fillBlock.id,
      effectIds: [],
      properties: {},
    } as BlockData;

    applyShapeFillStroke(node, {}, { x: 0, y: 0, width: 300, height: 300 }, block, (id) =>
      id === fillBlock.id ? fillBlock : undefined,
    );
    await Promise.resolve();

    expect(loadImageMock).toHaveBeenCalledWith("photo.png");
    expect(node.fillPatternImage).toHaveBeenCalledWith(image);
    expect(node.fillPatternScale).toHaveBeenCalledWith({ x: -9, y: 9 });
    expect(node.fillPatternRotation).toHaveBeenCalledWith(90);
    expect(node.fillPatternOffset).toHaveBeenCalledWith({ x: 50, y: 25 });
    expect(node.fillPatternX).toHaveBeenCalledWith(225);
    expect(node.fillPatternY).toHaveBeenCalledWith(450);
    expect(attrs.get("__fillLoadedSrc")).toBe("photo.png");
    expect(batchDraw).toHaveBeenCalledOnce();
  });

  it("projects a linear stroke gradient across the local fill box", () => {
    const node = {
      fillEnabled: vi.fn(),
      fillPriority: vi.fn(),
      fillPatternImage: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      strokeLinearGradientStartPoint: vi.fn(),
      strokeLinearGradientEndPoint: vi.fn(),
      strokeLinearGradientColorStops: vi.fn(),
      shadowEnabled: vi.fn(),
    } as unknown as Konva.Rect;

    applyShapeFillStroke(
      node,
      {
        [STROKE_ENABLED]: true,
        [STROKE_WIDTH]: 5,
        [STROKE_GRADIENT_ENABLED]: true,
        [STROKE_GRADIENT_ANGLE]: 0,
        [STROKE_GRADIENT_STOPS]: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ],
      },
      { x: 10, y: 20, width: 100, height: 40 },
    );

    expect(node.strokeLinearGradientStartPoint).toHaveBeenCalledWith({ x: 10, y: 40 });
    expect(node.strokeLinearGradientEndPoint).toHaveBeenCalledWith({ x: 110, y: 40 });
    expect(node.strokeLinearGradientColorStops).toHaveBeenLastCalledWith([
      0,
      "#ff0000",
      1,
      "#0000ff",
    ]);
    expect(node.strokeWidth).toHaveBeenCalledWith(5);
  });

  it("clears stale gradient stops for solid, empty, and disabled strokes", () => {
    const node = {
      fillEnabled: vi.fn(),
      fillPriority: vi.fn(),
      fillPatternImage: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      strokeLinearGradientStartPoint: vi.fn(),
      strokeLinearGradientEndPoint: vi.fn(),
      strokeLinearGradientColorStops: vi.fn(),
      shadowEnabled: vi.fn(),
    } as unknown as Konva.Rect;
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const solid = { r: 1, g: 0, b: 0, a: 1 };

    applyShapeFillStroke(
      node,
      {
        [STROKE_ENABLED]: true,
        [STROKE_COLOR]: solid,
        [STROKE_WIDTH]: 4,
      },
      box,
    );
    expect(node.strokeLinearGradientColorStops).toHaveBeenLastCalledWith(undefined);
    expect(node.stroke).toHaveBeenLastCalledWith("#ff0000");

    applyShapeFillStroke(
      node,
      {
        [STROKE_ENABLED]: true,
        [STROKE_COLOR]: solid,
        [STROKE_WIDTH]: 4,
        [STROKE_GRADIENT_ENABLED]: true,
        [STROKE_GRADIENT_STOPS]: [],
      },
      box,
    );
    expect(node.strokeLinearGradientColorStops).toHaveBeenLastCalledWith(undefined);
    expect(node.stroke).toHaveBeenLastCalledWith("#ff0000");

    applyShapeFillStroke(
      node,
      {
        [STROKE_ENABLED]: false,
        [STROKE_COLOR]: solid,
        [STROKE_WIDTH]: 4,
        [STROKE_GRADIENT_ENABLED]: true,
        [STROKE_GRADIENT_STOPS]: [{ offset: 0, color: "#ffffff" }],
      },
      box,
    );
    expect(node.strokeLinearGradientColorStops).toHaveBeenLastCalledWith(undefined);
    expect(node.stroke).toHaveBeenLastCalledWith("");
    expect(node.strokeWidth).toHaveBeenLastCalledWith(0);
  });
});
