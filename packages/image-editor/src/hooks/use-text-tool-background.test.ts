import { type EditxEngine, hexToColor } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
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
