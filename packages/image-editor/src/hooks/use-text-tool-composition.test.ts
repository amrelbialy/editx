import { type EditxEngine, hexToColor } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../config/presets";
import { findPresetById } from "../config/resolve-presets";
import { useImageEditorStore } from "../store/image-editor-store";
import { useTextTool } from "./use-text-tool";

function makeEngine() {
  let nextId = 100;
  const block = {
    getPageDimensions: vi.fn(() => ({ width: 1080, height: 1080 })),
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
    setFillEnabled: vi.fn(),
    getShape: vi.fn(() => 500),
    setFloat: vi.fn(),
    setShapeGeometry: vi.fn(),
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

describe("useTextTool composition and width behavior", () => {
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
                      fill: { kind: "color", color: "#00000000" },
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
    });
    expect(block.setFillSolidColor).toHaveBeenCalledWith(101, hexToColor("#00000000"));
    expect(block.setFillEnabled).toHaveBeenCalledWith(101, false);
    expect(block.setStrokeEnabled).toHaveBeenCalledWith(101, true);
    expect(block.setShapeGeometry).toHaveBeenCalledWith(101, {
      type: "rect",
      cornerRadius: 12,
    });
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
