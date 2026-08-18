import type { EditxEngine, ImageFillCrop } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useImageEditorStore } from "../store/image-editor-store";
import { useImageFillCrop } from "./use-image-fill-crop";

const CROP: ImageFillCrop = {
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  sourceAspectRatio: 2,
  fit: "cover",
  alignment: "center",
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

function makeEngine() {
  let onEditModeChanged: ((info: { mode: string; previousMode: string }) => void) | null = null;
  const editor = {
    getCropEditTarget: vi.fn(() => "image-fill"),
    getImageFillCrop: vi.fn(() => CROP),
    onImageFillCropChanged: vi.fn(() => () => {}),
    commitCrop: vi.fn(),
    fitToScreen: vi.fn(),
  };
  const engine = {
    editor,
    block: { select: vi.fn() },
    onEditModeChanged: vi.fn((callback) => {
      onEditModeChanged = callback;
      return () => {};
    }),
  } as unknown as EditxEngine;
  return {
    engine,
    emitEditModeChange: (info: { mode: string; previousMode: string }) => onEditModeChanged?.(info),
  };
}

describe("useImageFillCrop", () => {
  beforeEach(() => {
    useImageEditorStore.setState({ activeTool: "select", propertySidePanel: null });
  });

  it("clears an active crop when the engine instance changes", () => {
    const first = makeEngine();
    const firstEngine = first.engine;
    const engineRef = { current: firstEngine };
    const enterCropMode = vi.fn();
    const { result, rerender } = renderHook(
      ({ engine }) => useImageFillCrop({ engineRef, engine, enterCropMode }),
      { initialProps: { engine: firstEngine } },
    );

    act(() => result.current.enter(7));
    expect(result.current.isActive).toBe(true);

    const nextEngine = makeEngine().engine;
    engineRef.current = nextEngine;
    rerender({ engine: nextEngine });

    expect(result.current.isActive).toBe(false);
    expect(result.current.crop).toBeNull();
    expect(useImageEditorStore.getState().activeTool).toBe("select");
  });

  it("clears local crop UI when outside dismissal exits Crop mode", () => {
    const current = makeEngine();
    const engineRef = { current: current.engine };
    const { result } = renderHook(() =>
      useImageFillCrop({ engineRef, engine: current.engine, enterCropMode: vi.fn() }),
    );
    act(() => result.current.enter(7));

    act(() => current.emitEditModeChange({ previousMode: "Crop", mode: "Transform" }));

    expect(result.current.isActive).toBe(false);
    expect(useImageEditorStore.getState().activeTool).toBe("select");
    expect(current.engine.block.select).toHaveBeenCalledWith(7);
  });
});
