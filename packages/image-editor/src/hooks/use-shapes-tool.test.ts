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
    setFillEnabled: vi.fn(),
    setStrokeEnabled: vi.fn(),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn(),
    setOpacity: vi.fn(),
    getShape: vi.fn(() => 201),
    setFloat: vi.fn(),
    setShapeGeometry: vi.fn(),
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

  it("creates the gradient fill once and sets its values directly", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("gradient-sunset"));

    expect(block.addShape.mock.calls[0][2]).toBe("gradient");
    expect(block.changeFillKind).not.toHaveBeenCalled();
    expect(block.setFillGradient).toHaveBeenCalledTimes(1);
    expect(block.setFillSolidColor).not.toHaveBeenCalled();
  });

  it("creates the image fill once and sets its values directly", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("image-rect"));

    expect(block.addShape.mock.calls[0][2]).toBe("image");
    expect(block.changeFillKind).not.toHaveBeenCalled();
    expect(block.setFillImage).toHaveBeenCalledTimes(1);
    expect(block.setFillImage.mock.calls[0][1].src).toMatch(/^data:image\/png;base64,/);
  });

  it("keeps Arrow available as a semantic line preset", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("filled-arrow"));

    expect(block.addShape.mock.calls[0][1]).toBe("line");
    expect(block.setShapeGeometry).toHaveBeenCalledWith(200, {
      type: "line",
      pointerLength: 15,
      pointerWidth: 15,
    });
    expect(block.setStrokeEnabled).toHaveBeenCalledWith(200, true);
    expect(block.setStrokeWidth).toHaveBeenCalledWith(200, 10);
  });

  it("applies complete authored polygon, star, rectangle, and path geometry", () => {
    const pathData = "M0 0 L10 0 L5 10 Z";
    const presetGroups = [
      {
        id: "custom",
        label: "Custom",
        presets: [
          {
            id: "poly",
            label: "Poly",
            shape: { kind: "polygon" as const, sides: 7 },
            fill: { kind: "color" as const },
            preview: { kind: "shape" as const },
          },
          {
            id: "star",
            label: "Star",
            shape: { kind: "star" as const, points: 8, innerDiameter: 0.3 },
            fill: { kind: "color" as const },
            preview: { kind: "shape" as const },
          },
          {
            id: "rect",
            label: "Rect",
            shape: { kind: "rect" as const, cornerRadius: 12 },
            fill: { kind: "color" as const },
            preview: { kind: "shape" as const },
          },
          {
            id: "path",
            label: "Path",
            shape: { kind: "path" as const, pathData, viewBox: { width: 10, height: 10 } },
            fill: { kind: "color" as const },
            preview: { kind: "shape" as const },
          },
        ],
      },
    ];
    const customConfig = { shapes: { presetGroups } } as ImageEditorConfig;
    const { engine, block } = makeEngine();
    const { result } = renderHook(() =>
      useShapesTool({ engineRef: ref(engine), config: customConfig }),
    );

    for (const id of ["poly", "star", "rect", "path"]) {
      act(() => result.current.handleAddShapePreset(id));
    }

    expect(block.setShapeGeometry).toHaveBeenNthCalledWith(1, 200, {
      type: "polygon",
      sides: 7,
    });
    expect(block.setShapeGeometry).toHaveBeenNthCalledWith(2, 200, {
      type: "star",
      points: 8,
      innerDiameter: 0.3,
    });
    expect(block.setShapeGeometry).toHaveBeenNthCalledWith(3, 200, {
      type: "rect",
      cornerRadius: 12,
    });
    expect(block.setShapeGeometry).toHaveBeenNthCalledWith(4, 200, {
      type: "path",
      name: "path",
      pathData,
      viewBox: { width: 10, height: 10 },
    });
    expect(block.addShape.mock.calls[3][7]).toMatchObject({
      pathData,
      viewBox: { width: 10, height: 10 },
    });
    expect(engine.beginBatch).toHaveBeenCalledTimes(4);
    expect(engine.endBatch).toHaveBeenCalledTimes(4);
  });

  it("preserves an explicit path name", () => {
    const namedConfig = {
      shapes: {
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "path-preset",
                label: "Path",
                shape: {
                  kind: "path",
                  name: "authored-path",
                  pathData: "M0 0 L10 0 L5 10 Z",
                  viewBox: { width: 10, height: 10 },
                },
                fill: { kind: "color" },
                preview: { kind: "shape" },
              },
            ],
          },
        ],
      },
    } as ImageEditorConfig;
    const { engine, block } = makeEngine();
    const { result } = renderHook(() =>
      useShapesTool({ engineRef: ref(engine), config: namedConfig }),
    );

    act(() => result.current.handleAddShapePreset("path-preset"));

    expect(block.setShapeGeometry).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ type: "path", name: "authored-path" }),
    );
  });

  it("stores transparent solid color and disables fill while retaining an outline", () => {
    const transparentConfig = {
      shapes: {
        presetGroups: [
          {
            id: "custom",
            label: "Custom",
            presets: [
              {
                id: "outline",
                label: "Outline",
                shape: { kind: "rect" },
                fill: { kind: "color", color: "#12345600" },
                stroke: { color: "#abcdef", width: 4 },
                preview: { kind: "shape" },
              },
            ],
          },
        ],
      },
    } as ImageEditorConfig;
    const { engine, block } = makeEngine();
    const { result } = renderHook(() =>
      useShapesTool({ engineRef: ref(engine), config: transparentConfig }),
    );

    act(() => result.current.handleAddShapePreset("outline"));

    expect(block.setFillSolidColor).toHaveBeenCalledWith(200, expect.objectContaining({ a: 0 }));
    expect(block.setFillEnabled).toHaveBeenCalledWith(200, false);
    expect(block.setStrokeEnabled).toHaveBeenCalledWith(200, true);
    expect(block.setStrokeWidth).toHaveBeenCalledWith(200, 4);
  });

  it("applies the built-in outline category paint", () => {
    const { engine, block } = makeEngine();
    const { result } = renderHook(() => useShapesTool({ engineRef: ref(engine), config }));

    act(() => result.current.handleAddShapePreset("outline-diamond"));

    expect(block.setFillEnabled).toHaveBeenCalledWith(200, false);
    expect(block.setStrokeEnabled).toHaveBeenCalledWith(200, true);
    expect(block.setStrokeColor).toHaveBeenCalledTimes(1);
    expect(block.setStrokeWidth).toHaveBeenCalledWith(200, 6);
    expect(block.setShapeGeometry).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ type: "path", name: "diamond" }),
    );
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
