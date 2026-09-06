import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageEditorConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { useCropTool } from "./use-crop-tool";

function makeEngine(dims: { width: number; height: number } | null = { width: 100, height: 80 }) {
  let cropDims = dims;
  const block = {
    deselectAll: vi.fn(),
    getCropVisualDimensions: vi.fn(() => cropDims),
    applyCropRatio: vi.fn(),
    applyCropDimensions: vi.fn((_id: number, w: number, h: number) => {
      cropDims = { width: w, height: h };
    }),
  };
  const editor = {
    setEditMode: vi.fn(),
    commitCrop: vi.fn(),
    cancelCrop: vi.fn(),
    fitToScreen: vi.fn(),
    getImageFillCrop: vi.fn(() => null),
    undo: vi.fn(),
  };
  const engine = { block, editor } as unknown as EditxEngine;
  return {
    engine,
    block,
    editor,
    setCropDims(next: { width: number; height: number }) {
      cropDims = next;
    },
  };
}

function ref(engine: EditxEngine): React.RefObject<EditxEngine | null> {
  return { current: engine };
}

const config = {
  crop: {
    aspectRatios: [
      { id: "free", ratio: "free" },
      { id: "square", ratio: 1 },
      { id: "original", ratio: "original" },
    ],
  },
} as unknown as ImageEditorConfig;

function resetStore() {
  useImageEditorStore.setState({
    activeTool: "select",
    editableBlockId: 1,
    cropPreset: "free",
    originalImage: null,
    editingTextBlockId: 5,
    textSelectionRange: { from: 0, to: 3 },
  });
}

describe("useCropTool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enterCropMode switches into crop mode and seeds overlay dimensions", () => {
    const h = makeEngine({ width: 120, height: 90 });
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.enterCropMode();
    });

    const state = useImageEditorStore.getState();
    expect(state.activeTool).toBe("crop");
    expect(state.cropPreset).toBe("free");
    // Lingering block-level UI is dismissed before showing the crop overlay.
    expect(state.editingTextBlockId).toBeNull();
    expect(state.textSelectionRange).toBeNull();
    expect(h.block.deselectAll).toHaveBeenCalledTimes(1);
    expect(h.editor.setEditMode).toHaveBeenCalledWith("Crop", { blockId: 1 });
    expect(result.current.cropDimensions).toEqual({ width: 120, height: 90 });
  });

  it("enterCropMode is a no-op when there is no editable block", () => {
    useImageEditorStore.setState({ editableBlockId: null });
    const h = makeEngine();
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.enterCropMode();
    });

    expect(h.editor.setEditMode).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().activeTool).toBe("select");
  });

  it("exitCropMode returns to transform mode and clears dimensions", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.enterCropMode();
    });
    act(() => {
      result.current.exitCropMode();
    });

    expect(h.editor.setEditMode).toHaveBeenLastCalledWith("Transform");
    expect(h.editor.fitToScreen).toHaveBeenCalled();
    expect(useImageEditorStore.getState().activeTool).toBe("select");
    expect(result.current.cropDimensions).toBeNull();
  });

  it("handleCropPresetChange applies a fixed numeric aspect ratio", () => {
    const h = makeEngine({ width: 50, height: 50 });
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.handleCropPresetChange("square");
    });

    expect(h.block.applyCropRatio).toHaveBeenCalledWith(1, 1);
    expect(result.current.cropDimensions).toEqual({ width: 50, height: 50 });
  });

  it("keeps CropPanel actions on an explicitly targeted graphic", () => {
    const h = makeEngine({ width: 200, height: 100 });
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => result.current.enterCropMode(7));
    act(() => result.current.handleCropPresetChange("square"));
    act(() => result.current.handleResizeDimensions(160, 90));

    expect(h.block.applyCropRatio).toHaveBeenCalledWith(7, 1);
    expect(h.block.applyCropDimensions).toHaveBeenCalledWith(7, 160, 90);
    expect(h.block.getCropVisualDimensions).toHaveBeenLastCalledWith(7);
  });

  it("handleCropPresetChange applies a null ratio for the free preset", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.handleCropPresetChange("free");
    });

    expect(h.block.applyCropRatio).toHaveBeenCalledWith(1, null);
  });

  it("uses the fill source ratio for an image-filled graphic's 'original' preset", () => {
    useImageEditorStore.setState({
      originalImage: { src: "x", width: 200, height: 100, name: "x" },
    });
    const h = makeEngine();
    h.editor.getImageFillCrop.mockReturnValue({ sourceAspectRatio: 1.5 } as never);
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => result.current.enterCropMode(7));
    act(() => {
      result.current.handleCropPresetChange("original");
    });

    expect(h.block.applyCropRatio).toHaveBeenCalledWith(7, 1.5);
  });

  it("handleCropApply commits the crop and returns to select", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.handleCropApply();
    });

    expect(h.editor.commitCrop).toHaveBeenCalledOnce();
    expect(h.editor.undo).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().activeTool).toBe("select");
    expect(result.current.cropDimensions).toBeNull();
  });

  it("handleCropCancel discards the pending crop without undoing history", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.handleCropCancel();
    });

    expect(h.editor.cancelCrop).toHaveBeenCalledOnce();
    expect(h.editor.undo).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().activeTool).toBe("select");
  });

  it("handleResizeDimensions applies exact pixel dimensions and reads them back", () => {
    const h = makeEngine({ width: 10, height: 10 });
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.handleResizeDimensions(640, 480);
    });

    expect(h.block.applyCropDimensions).toHaveBeenCalledWith(1, 640, 480);
    expect(result.current.cropDimensions).toEqual({ width: 640, height: 480 });
  });

  it("polls overlay dimensions while crop mode is active", () => {
    const h = makeEngine({ width: 100, height: 100 });
    const { result } = renderHook(() => useCropTool({ engineRef: ref(h.engine), config }));

    act(() => {
      result.current.enterCropMode();
    });

    // Simulate the user dragging the overlay handles between polls.
    h.setCropDims({ width: 70, height: 55 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.cropDimensions).toEqual({ width: 70, height: 55 });
  });
});
