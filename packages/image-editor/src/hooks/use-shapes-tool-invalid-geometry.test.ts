import { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { useShapesTool } from "./use-shapes-tool";

function makeEngine() {
  const block = {
    getPageDimensions: vi.fn(() => ({ width: 1080, height: 1080 })),
    addShape: vi.fn(() => 200),
    setShapeGeometry: vi.fn(),
    select: vi.fn(),
  };
  const engine = { beginBatch: vi.fn(), endBatch: vi.fn(), block } as unknown as EditxEngine;
  return { engine, block };
}

beforeEach(() => {
  useImageEditorStore.setState({ editableBlockId: 1 });
});

it.each([
  ["polygon", { kind: "polygon", sides: 2 }],
  ["star", { kind: "star", points: 1, innerDiameter: 0.5 }],
  ["line", { kind: "line", pointerLength: 15, pointerWidth: -1 }],
])("rejects invalid %s geometry before insertion", (_kind, shape) => {
  const config = {
    shapes: {
      presetGroups: [
        {
          id: "invalid",
          label: "Invalid",
          presets: [
            {
              id: "invalid-geometry",
              label: "Invalid geometry",
              shape,
              fill: { kind: "color" },
              preview: { kind: "shape" },
            },
          ],
        },
      ],
    },
  } as ImageEditorConfig;
  const { engine, block } = makeEngine();
  const engineRef: React.RefObject<EditxEngine | null> = { current: engine };
  const { result } = renderHook(() => useShapesTool({ engineRef, config }));

  expect(() => act(() => result.current.handleAddShapePreset("invalid-geometry"))).not.toThrow();
  expect(engine.beginBatch).not.toHaveBeenCalled();
  expect(engine.endBatch).not.toHaveBeenCalled();
  expect(block.addShape).not.toHaveBeenCalled();
  expect(block.setShapeGeometry).not.toHaveBeenCalled();
  expect(block.select).not.toHaveBeenCalled();
});

it.each([
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
])("rejects invalid default corner radius %s before insertion", (defaultCornerRadius) => {
  const config = { shapes: { defaultCornerRadius } } as ImageEditorConfig;
  const { engine, block } = makeEngine();
  const engineRef: React.RefObject<EditxEngine | null> = { current: engine };
  const { result } = renderHook(() => useShapesTool({ engineRef, config }));

  expect(() => act(() => result.current.handleAddShape("rect"))).not.toThrow();
  expect(engine.beginBatch).not.toHaveBeenCalled();
  expect(engine.endBatch).not.toHaveBeenCalled();
  expect(block.addShape).not.toHaveBeenCalled();
  expect(block.select).not.toHaveBeenCalled();
});

it("leaves real engine children and history usable after invalid default geometry", () => {
  const engine = new EditxEngine();
  const pageId = engine.block.create("page");
  const config = { shapes: { defaultCornerRadius: -1 } } as ImageEditorConfig;
  const engineRef: React.RefObject<EditxEngine | null> = { current: engine };
  useImageEditorStore.setState({ editableBlockId: pageId });
  engine.clearHistory();
  const { result } = renderHook(() => useShapesTool({ engineRef, config }));

  act(() => result.current.handleAddShape("rect"));

  expect(engine.block.getChildren(pageId)).toEqual([]);
  expect(engine.canUndo()).toBe(false);
  const nextId = engine.block.create("graphic");
  expect(engine.canUndo()).toBe(true);
  engine.undo();
  expect(engine.block.exists(nextId)).toBe(false);
});
