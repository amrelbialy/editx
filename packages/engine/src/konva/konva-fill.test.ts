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
  FILL_IMAGE_FIT,
  FILL_IMAGE_SCALE,
  FILL_IMAGE_SRC,
  STROKE_COLOR,
  STROKE_ENABLED,
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
      fillPatternX: vi.fn(),
      fillPatternY: vi.fn(),
      fillPatternImage: vi.fn(),
      fillPatternScale: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
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
    expect(node.fillPatternScale).toHaveBeenCalledWith({ x: 9, y: 9 });
    expect(attrs.get("__fillLoadedSrc")).toBe("photo.png");
    expect(batchDraw).toHaveBeenCalledOnce();
  });
});
