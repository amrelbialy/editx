import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
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
});
