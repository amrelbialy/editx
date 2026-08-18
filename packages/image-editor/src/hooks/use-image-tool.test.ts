import {
  type EditxEngine,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  IMAGE_SRC,
} from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { processImageFile } from "../utils/process-image-file";
import { useImageTool } from "./use-image-tool";

vi.mock("../utils/process-image-file", () => ({
  processImageFile: vi.fn(),
}));

function makeEngine(blockType: "graphic" | "image") {
  const block = {
    getType: vi.fn(() => blockType),
    getFillImage: vi.fn(() => ({
      src: "original.png",
      fit: "contain" as const,
      offsetX: 0.25,
      offsetY: -0.2,
      scale: 1.5,
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
    })),
    setFillImage: vi.fn(),
    updateFillImage: vi.fn(),
    setString: vi.fn(),
    setFloat: vi.fn(),
  };
  return {
    block,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
  } as unknown as EditxEngine & {
    block: typeof block;
    beginBatch: ReturnType<typeof vi.fn>;
    endBatch: ReturnType<typeof vi.fn>;
  };
}

describe("useImageTool", () => {
  beforeEach(() => {
    vi.mocked(processImageFile).mockResolvedValue({
      src: "processed.png",
      width: 800,
      height: 600,
    });
  });

  it("replaces a graphic image-fill source while preserving its framing", async () => {
    const engine = makeEngine("graphic");
    const engineRef = { current: engine };
    const { result } = renderHook(() => useImageTool({ engineRef }));

    await act(() => result.current.handleReplaceImage(new File(["image"], "next.png"), 7));

    expect(processImageFile).toHaveBeenCalledOnce();
    expect(engine.block.updateFillImage).toHaveBeenCalledWith(7, { src: "processed.png" });
    expect(engine.block.setFillImage).not.toHaveBeenCalled();
    expect(engine.block.setString).not.toHaveBeenCalled();
  });

  it("keeps standalone image replacement behavior unchanged", async () => {
    const engine = makeEngine("image");
    const engineRef = { current: engine };
    const { result } = renderHook(() => useImageTool({ engineRef }));

    await act(() => result.current.handleReplaceImage(new File(["image"], "next.png"), 9));

    expect(engine.beginBatch).toHaveBeenCalledOnce();
    expect(engine.block.setString).toHaveBeenCalledWith(9, IMAGE_SRC, "processed.png");
    expect(engine.block.setFloat).toHaveBeenCalledWith(9, IMAGE_ORIGINAL_WIDTH, 800);
    expect(engine.block.setFloat).toHaveBeenCalledWith(9, IMAGE_ORIGINAL_HEIGHT, 600);
    expect(engine.endBatch).toHaveBeenCalledOnce();
    expect(engine.block.setFillImage).not.toHaveBeenCalled();
    expect(engine.block.updateFillImage).not.toHaveBeenCalled();
  });
});
