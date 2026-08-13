import type { EditxEngine } from "@editx/engine";
import { hexToColor, SHAPE_RECT_CORNER_RADIUS } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../config/presets";
import { findPresetById } from "../config/resolve-presets";
import { useImageEditorStore } from "../store/image-editor-store";
import { useTextTool } from "./use-text-tool";

function makeEngine(pageSize = { width: 1080, height: 1080 }) {
  let nextId = 100;
  const block = {
    getPageDimensions: vi.fn(() => pageSize),
    addText: vi.fn(() => ++nextId),
    addShape: vi.fn(() => ++nextId),
    setTextAlign: vi.fn(),
    setTextLineHeight: vi.fn(),
    setTextCurve: vi.fn(),
    setTextGradient: vi.fn(),
    setTextAutoWidth: vi.fn(),
    setTextStyle: vi.fn(),
    setRotation: vi.fn(),
    changeFillKind: vi.fn(),
    setFillGradient: vi.fn(),
    setFillImage: vi.fn(),
    setFillSolidColor: vi.fn(),
    getShape: vi.fn(() => 500),
    setFloat: vi.fn(),
    setOpacity: vi.fn(),
    setTextBackground: vi.fn(),
    setShadowEnabled: vi.fn(),
    setShadowColor: vi.fn(),
    setShadowOffsetX: vi.fn(),
    setShadowOffsetY: vi.fn(),
    setShadowBlur: vi.fn(),
    setStrokeEnabled: vi.fn(),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
    group: vi.fn(() => 999),
    refitGroupBounds: vi.fn(),
    select: vi.fn(),
  };
  const engine = { beginBatch: vi.fn(), endBatch: vi.fn(), block } as unknown as EditxEngine;
  return { engine, block };
}

function ref(engine: EditxEngine): React.RefObject<EditxEngine | null> {
  return { current: engine };
}

const config = { text: {} } as ImageEditorConfig;

beforeEach(() => {
  useImageEditorStore.setState({ editableBlockId: 1 });
});

describe("useTextTool.handleAddTextPreset", () => {
  it("inserts a single block in one batch and does not group", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("title"));

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(block.addText).toHaveBeenCalledTimes(1);
    expect(block.group).not.toHaveBeenCalled();
    expect(block.select).toHaveBeenCalledWith(101);
  });

  it("inserts N blocks in one batch and groups multi-block presets", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("heading-subtitle"));

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(block.addText).toHaveBeenCalledTimes(2);
    expect(block.group).toHaveBeenCalledTimes(1);
    expect(block.select).toHaveBeenCalledWith(999);
  });

  it("applies a curve for curved-text presets", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("arc-up"));

    expect(block.setTextCurve).toHaveBeenCalledTimes(1);
    const [, radius, direction] = block.setTextCurve.mock.calls[0];
    expect(radius).toBeGreaterThan(0);
    expect(direction).toBe("up");
  });

  it("sets the richer run highlight fields for the preserved highlight id", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("highlight"));

    expect(block.addText).toHaveBeenCalledTimes(1);
    const options = block.addText.mock.calls[0][6];
    expect(options.style).toMatchObject({
      backgroundColor: "#facc15",
      backgroundOpacity: 0.82,
      backgroundCornerRadius: 3,
      backgroundPadding: { top: 3, right: 8, bottom: 3, left: 8 },
    });
    expect(block.setTextGradient).not.toHaveBeenCalled();
  });

  it("applies a gradient (not a curve) for a gradient preset in the same batch", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("sunset"));

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(block.setTextCurve).not.toHaveBeenCalled();
    expect(block.setTextGradient).toHaveBeenCalledTimes(1);
    const [id, start, end, gradient] = block.setTextGradient.mock.calls[0];
    expect(id).toBe(101);
    expect(start).toBe(0);
    expect(end).toBe("Sunset".length);
    expect(gradient.type).toBe("linear");
    expect(gradient.stops).toHaveLength(2);
  });

  it("does not apply a gradient for a curved preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("arc-up"));

    expect(block.setTextGradient).not.toHaveBeenCalled();
  });

  it("centers a style preset (no geometry) and enables auto-width", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    // "elegant" is a style() preset: it carries NO authored geometry.
    act(() => result.current.handleAddTextPreset("elegant"));

    expect(block.addText).toHaveBeenCalledTimes(1);
    const [pageId, x, y, width, height] = block.addText.mock.calls[0];
    const pageW = 1080;
    const scale = 1; // pageW / REFERENCE_DIM (1080 / 1080)
    const expectedWidth = Math.min(pageW * 0.35, 400 * scale);
    expect(pageId).toBe(1);
    expect(width).toBeCloseTo(expectedWidth, 5);
    expect(x).toBeCloseTo((pageW - expectedWidth) / 2, 5); // horizontally centered
    expect(y).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // Style blocks hug their content.
    expect(block.setTextAutoWidth).toHaveBeenCalledWith(101, true);
    expect(block.group).not.toHaveBeenCalled();
  });

  it("places a composition preset with authored geometry and explicit auto-width", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    // "heading-subtitle" is a multi-block composition with authored fractions.
    act(() => result.current.handleAddTextPreset("heading-subtitle"));

    expect(block.addText).toHaveBeenCalledTimes(2);
    const preset = findPresetById(DEFAULT_TEXT_PRESET_GROUPS, "heading-subtitle");
    const authored = preset?.composition?.elements.find(
      (element) => element.kind === "text" && element.block === 0,
    );
    const [, x, y, width] = block.addText.mock.calls[0];
    expect(x).toBeCloseTo((authored?.layout.x ?? 0) * 1080, 5);
    expect(y).toBeCloseTo((authored?.layout.y ?? 0) * 1080, 5);
    expect(width).toBeCloseTo((authored?.layout.width ?? 0) * 1080, 5);
    // Every line shares one column, so the blocks align on a common axis.
    const [, x2] = block.addText.mock.calls[1];
    expect(x2).toBeCloseTo(x, 5);
    expect(block.setTextAutoWidth).toHaveBeenCalledTimes(2);
    expect(block.setRotation).toHaveBeenCalledTimes(2);
    expect(block.setRotation).toHaveBeenNthCalledWith(1, 101, -3);
    expect(block.setRotation).toHaveBeenNthCalledWith(2, 102, -3);
    // Multi-block presets are still grouped into one unit.
    expect(block.group).toHaveBeenCalledTimes(1);
  });

  it("inserts composition elements back-to-front with shapes and width modes", () => {
    const { engine, block } = makeEngine();
    const compositionConfig = {
      text: {
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "shape-combo",
                label: "Shape combo",
                blocks: [{ text: "Label", fill: "#ffffff" }],
                composition: {
                  elements: [
                    {
                      kind: "shape",
                      layout: { x: 0.1, y: 0.2, width: 0.8, height: 0.2, rotation: 2 },
                      shape: { kind: "rect", cornerRadius: 12 },
                      fill: { kind: "color", color: "#dc2626" },
                      stroke: { color: "#ffffff", width: 3 },
                      opacity: 0.9,
                    },
                    {
                      kind: "text",
                      block: 0,
                      layout: { x: 0.2, y: 0.25, width: 0.6, height: 0.1 },
                      widthMode: "auto",
                    },
                  ],
                },
                preview: { kind: "text", sample: "Label" },
              },
            ],
          },
        ],
      },
    } as ImageEditorConfig;
    const { result } = renderHook(() =>
      useTextTool({ engineRef: ref(engine), config: compositionConfig }),
    );

    act(() => result.current.handleAddTextPreset("shape-combo"));

    expect(block.addShape).toHaveBeenCalledBefore(block.addText);
    expect(block.addShape).toHaveBeenCalledWith(1, "rect", "color", 108, 216, 864, 216, {
      sides: undefined,
      pathData: undefined,
      viewBox: undefined,
    });
    expect(block.setFillSolidColor).toHaveBeenCalledWith(101, hexToColor("#dc2626"));
    expect(block.setFloat).toHaveBeenCalledWith(500, SHAPE_RECT_CORNER_RADIUS, 12);
    expect(block.setTextAutoWidth).toHaveBeenCalledWith(102, true);
    expect(block.group).toHaveBeenCalledWith([101, 102]);
    expect(block.refitGroupBounds).toHaveBeenCalledWith(999);
    expect(block.select).toHaveBeenCalledWith(999);
  });

  it("keeps authored position but enables auto-width for a single-block plain preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    // "title" is a single-block PLAIN preset with authored geometry.
    act(() => result.current.handleAddTextPreset("title"));

    expect(block.addText).toHaveBeenCalledTimes(1);
    // Authored layout is preserved: x = 0.2*pageW, y = 0.4*pageH.
    const [, x, y] = block.addText.mock.calls[0];
    expect(x).toBeCloseTo(0.2 * 1080, 5);
    expect(y).toBeCloseTo(0.4 * 1080, 5);
    // Single-block presets hug their content even with authored geometry.
    expect(block.setTextAutoWidth).toHaveBeenCalledWith(101, true);
    expect(block.group).not.toHaveBeenCalled();
  });

  it("does not enable auto-width for a curved single-block preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    // "arc-up" is a single curved block: the arc layout owns its sizing.
    act(() => result.current.handleAddTextPreset("arc-up"));

    expect(block.addText).toHaveBeenCalledTimes(1);
    expect(block.setTextAutoWidth).not.toHaveBeenCalled();
  });

  it("enables auto-width for the plain add-text path", () => {
    const { engine, block } = makeEngine();
    const legacyConfig = {
      text: { presets: [{ id: "body", label: "Body", text: "Body" }] },
    } as ImageEditorConfig;
    const { result } = renderHook(() =>
      useTextTool({ engineRef: ref(engine), config: legacyConfig }),
    );

    act(() => result.current.handleAddText("body"));

    expect(block.setTextAutoWidth).toHaveBeenCalledWith(101, true);
  });

  it("falls back to the legacy flow for unknown ids", () => {
    const { engine, block } = makeEngine();
    const legacyConfig = {
      text: { presets: [{ id: "body", label: "Body", text: "Body" }] },
    } as ImageEditorConfig;
    const { result } = renderHook(() =>
      useTextTool({ engineRef: ref(engine), config: legacyConfig }),
    );

    act(() => result.current.handleAddTextPreset("body"));

    // Resolved via legacy mapping (single synthetic category), one text block.
    expect(block.addText).toHaveBeenCalledTimes(1);
    expect(block.group).not.toHaveBeenCalled();
  });
});

describe("useTextTool background box", () => {
  it("applies the authored box (and its shadow) inside the insertion batch", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("promo-code"));

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    // Only the headline block carries the white card.
    expect(block.setTextBackground).toHaveBeenCalledTimes(1);
    expect(block.setTextBackground).toHaveBeenCalledWith(102, {
      enabled: true,
      geometry: "frame",
      color: hexToColor("#ffffff"),
      cornerRadius: 8,
      padding: { top: 24, right: 36, bottom: 24, left: 36 },
    });
    expect(block.setShadowEnabled).toHaveBeenCalledWith(102, true);
    expect(block.setShadowColor).toHaveBeenCalledWith(102, hexToColor("#052e16"));
    expect(block.setShadowOffsetX).toHaveBeenCalledWith(102, 12);
    expect(block.setShadowOffsetY).toHaveBeenCalledWith(102, 12);
    expect(block.setShadowBlur).toHaveBeenCalledWith(102, 0);
    expect(block.setStrokeEnabled).toHaveBeenCalledWith(102, true);
    expect(block.setStrokeColor).toHaveBeenCalledWith(102, hexToColor("#166534"));
    expect(block.setStrokeWidth).toHaveBeenCalledWith(102, 3);
  });

  it("scales every box length by the canvas scale factor", () => {
    // 540 / 1080 → scaleFactor 0.5.
    const { engine, block } = makeEngine({ width: 540, height: 540 });
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("promo-code"));

    expect(block.setTextBackground).toHaveBeenCalledWith(102, {
      enabled: true,
      geometry: "frame",
      color: hexToColor("#ffffff"),
      cornerRadius: 4,
      padding: { top: 12, right: 18, bottom: 12, left: 18 },
    });
    expect(block.setShadowOffsetX).toHaveBeenCalledWith(102, 6);
    expect(block.setShadowOffsetY).toHaveBeenCalledWith(102, 6);
    expect(block.setStrokeWidth).toHaveBeenCalledWith(102, 1.5);
  });

  it("scales the single multiline text-box padding", () => {
    const { engine, block } = makeEngine({ width: 2160, height: 2160 });
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("text-box"));

    expect(block.setTextBackground).toHaveBeenCalledTimes(1);
    expect(block.setTextBackground).toHaveBeenCalledWith(101, {
      enabled: true,
      geometry: "frame",
      color: hexToColor("#c7d2fe"),
      cornerRadius: 4,
      padding: { top: 56, right: 68, bottom: 56, left: 68 },
    });
    expect(block.setShadowEnabled).not.toHaveBeenCalled();
    expect(block.setStrokeEnabled).not.toHaveBeenCalled();
  });

  it("does not touch the background box for a preset without one", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useTextTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddTextPreset("title"));

    expect(block.setTextBackground).not.toHaveBeenCalled();
    expect(block.setShadowEnabled).not.toHaveBeenCalled();
    expect(block.setStrokeEnabled).not.toHaveBeenCalled();
  });
});
