import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { useShapesTool } from "./use-shapes-tool";

function makeEngine(addShapeImpl?: () => number) {
  const block = {
    getPageDimensions: vi.fn(() => ({ width: 1080, height: 1080 })),
    addShape: vi.fn(addShapeImpl ?? (() => 200)),
    changeFillKind: vi.fn(),
    setFillGradient: vi.fn(),
    setFillImage: vi.fn(),
    setFillSolidColor: vi.fn(),
    setStrokeEnabled: vi.fn(),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
    setOpacity: vi.fn(),
    getShape: vi.fn(() => 201),
    setFloat: vi.fn(),
    select: vi.fn(),
  };
  const engine = { beginBatch: vi.fn(), endBatch: vi.fn(), block } as unknown as EditxEngine;
  return { engine, block };
}

function ref(engine: EditxEngine): React.RefObject<EditxEngine | null> {
  return { current: engine };
}

const config = { shapes: {} } as ImageEditorConfig;

beforeEach(() => {
  useImageEditorStore.setState({ editableBlockId: 1 });
});

describe("useShapesTool.handleAddShapePreset", () => {
  it("inserts a solid-fill shape in one batch", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("filled-rect"));

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(block.addShape).toHaveBeenCalledTimes(1);
    expect(block.addShape.mock.calls[0][1]).toBe("rect");
    expect(block.addShape.mock.calls[0][2]).toBe("color");
    expect(block.setFillSolidColor).toHaveBeenCalledTimes(1);
    expect(block.setFillGradient).not.toHaveBeenCalled();
    expect(block.select).toHaveBeenCalledWith(200);
  });

  it("changes fill kind then sets the gradient for a gradient preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("gradient-sunset"));

    expect(block.changeFillKind).toHaveBeenCalledWith(200, "gradient");
    expect(block.setFillGradient).toHaveBeenCalledTimes(1);
    expect(block.setFillSolidColor).not.toHaveBeenCalled();
  });

  it("changes fill kind then sets the image for an image preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("image-rect"));

    expect(block.changeFillKind).toHaveBeenCalledWith(200, "image");
    expect(block.setFillImage).toHaveBeenCalledTimes(1);
  });

  it("skips a preset whose path the engine rejects without throwing", () => {
    const { engine, block } = makeEngine(() => {
      throw new Error("Invalid SVG path data");
    });
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    expect(() => act(() => result.current.handleAddShapePreset("path-burst"))).not.toThrow();
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(block.select).not.toHaveBeenCalled();
    expect(block.setFillSolidColor).not.toHaveBeenCalled();
  });
});
