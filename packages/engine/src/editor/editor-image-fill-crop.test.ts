import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import type { ImageFillMode } from "../block/block.types";
import { CROP_ENABLED } from "../block/property-keys";
import { EditxEngine } from "../editx-engine";
import type { RendererAdapter } from "../render-adapter";

describe("graphic image-fill crop", () => {
  let engine: EditxEngine;
  let renderer: RendererAdapter;

  beforeEach(() => {
    renderer = createMockRenderer();
    engine = new EditxEngine({ renderer });
  });

  function createGraphic(mode: ImageFillMode = "crop", src = "fill.png"): number {
    const blockId = engine.block.create("graphic");
    const fillId = engine.block.createFill("image");
    engine.block.setFill(blockId, fillId);
    engine.block.setFillEnabled(blockId, true);
    engine.block.setPosition(blockId, 42, 24);
    engine.block.setSize(blockId, 240, 160);
    engine.block.setFillImage(blockId, {
      src,
      mode,
      offsetX: 12,
      offsetY: 18,
      scale: 1,
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
    });
    engine.clearHistory();
    return blockId;
  }

  it.each([
    "crop",
    "cover",
    "fit",
    "tile",
  ] as const)("enters an enabled %s image fill with its persisted mode", (mode) => {
    const blockId = createGraphic(mode);

    expect(engine.editor.getCropEditTarget(blockId)).toBe("image-fill");
    engine.editor.setEditMode("Crop", { blockId });

    expect(renderer.showImageFillCropPreview).toHaveBeenCalledWith(blockId, {
      x: 42,
      y: 24,
      width: 240,
      height: 160,
      mode,
      alignment: "center",
      offsetX: mode === "crop" || mode === "tile" ? 12 : 0,
      offsetY: mode === "crop" || mode === "tile" ? 18 : 0,
      scale: 1,
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
    });
    expect(renderer.showCropOverlay).not.toHaveBeenCalled();
  });

  it("requires a graphic, enabled fill, and non-empty source", () => {
    const empty = createGraphic("crop", "  ");
    const disabled = createGraphic();
    engine.block.setFillEnabled(disabled, false);
    const image = engine.block.create("image");

    expect(engine.editor.getCropEditTarget(empty)).toBeNull();
    expect(engine.editor.getCropEditTarget(disabled)).toBeNull();
    expect(engine.editor.getCropEditTarget(image)).toBe("source-crop");
  });

  it("keeps frame and content preview changes out of persisted state", () => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });

    engine.editor.updateImageFillCrop({
      x: 10,
      width: 300,
      offsetX: 30,
      scale: 2,
      rotation: 180,
      flipVertical: true,
    });

    expect(engine.editor.getImageFillCrop()).toMatchObject({
      x: 10,
      width: 300,
      offsetX: 30,
      scale: 2,
      rotation: 180,
      flipVertical: true,
    });
    expect(engine.block.getPosition(blockId)).toEqual({ x: 42, y: 24 });
    expect(engine.block.getSize(blockId)).toEqual({ width: 240, height: 160 });
    expect(engine.block.getFillImage(blockId)).toMatchObject({
      offsetX: 12,
      scale: 1,
      rotation: 90,
      flipVertical: false,
    });
    expect(engine.block.getBool(blockId, CROP_ENABLED)).toBe(false);
    expect(engine.editor.canUndo()).toBe(false);
  });

  it("routes ratio and dimensions to the active graphic preview", () => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });

    engine.block.applyCropRatio(blockId, 1);
    expect(engine.editor.getImageFillCrop()).toMatchObject({ y: -16, width: 240, height: 240 });
    expect(engine.block.getCropVisualDimensions(blockId)).toEqual({ width: 240, height: 240 });

    engine.block.applyCropDimensions(blockId, 120, 80);
    expect(engine.editor.getImageFillCrop()).toMatchObject({
      x: 102,
      y: 64,
      width: 120,
      height: 80,
    });
  });

  it("commits frame and fill changes as exactly one undo entry", () => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });
    engine.editor.updateImageFillCrop({
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      mode: "tile",
      alignment: "bottom-right",
      offsetX: 30,
      offsetY: 40,
      scale: 2,
      rotation: 270,
      flipHorizontal: false,
      flipVertical: true,
    });

    expect(engine.editor.commitCrop()).toBeNull();
    expect(engine.block.getPosition(blockId)).toEqual({ x: 10, y: 20 });
    expect(engine.block.getSize(blockId)).toEqual({ width: 300, height: 200 });
    expect(engine.block.getFillImage(blockId)).toEqual({
      src: "fill.png",
      mode: "tile",
      alignment: "center",
      offsetX: 30,
      offsetY: 40,
      scale: 2,
      rotation: 270,
      flipHorizontal: false,
      flipVertical: true,
    });

    engine.editor.undo();
    expect(engine.block.getPosition(blockId)).toEqual({ x: 42, y: 24 });
    expect(engine.block.getSize(blockId)).toEqual({ width: 240, height: 160 });
    expect(engine.block.getFillImage(blockId)).toMatchObject({ mode: "crop", rotation: 90 });
    expect(engine.editor.canUndo()).toBe(false);
  });

  it("uses the committed crop as the baseline when crop is re-entered", () => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });
    engine.editor.updateImageFillCrop({
      x: 60,
      y: 40,
      width: 120,
      height: 80,
      offsetX: 30,
      offsetY: 45,
      scale: 2,
    });
    engine.editor.commitCrop();
    vi.mocked(renderer.showImageFillCropPreview!).mockClear();

    engine.editor.setEditMode("Crop", { blockId });

    expect(renderer.showImageFillCropPreview).toHaveBeenCalledWith(
      blockId,
      expect.objectContaining({
        x: 60,
        y: 40,
        width: 120,
        height: 80,
        offsetX: 30,
        offsetY: 45,
        scale: 2,
      }),
    );
  });

  it("does not rewrite an unchanged Cover fill when Done is pressed", () => {
    const blockId = createGraphic("cover");
    engine.editor.setEditMode("Crop", { blockId });

    engine.editor.commitCrop();

    expect(engine.block.getFillImage(blockId)).toMatchObject({
      mode: "cover",
      alignment: "center",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });
    expect(engine.editor.canUndo()).toBe(false);
  });

  it.each(["cover", "fit"] as const)("restores committed %s state when reopened", (mode) => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });
    engine.editor.updateImageFillCrop({ mode, alignment: "bottom-right" });
    engine.editor.commitCrop();
    vi.mocked(renderer.showImageFillCropPreview!).mockClear();

    engine.editor.setEditMode("Crop", { blockId });

    expect(renderer.showImageFillCropPreview).toHaveBeenCalledWith(
      blockId,
      expect.objectContaining({
        mode,
        alignment: "bottom-right",
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      }),
    );
  });

  it("cancels explicitly or when Crop is left without Done", () => {
    const blockId = createGraphic();
    engine.editor.setEditMode("Crop", { blockId });
    engine.editor.updateImageFillCrop({ x: 99, scale: 3 });
    engine.editor.cancelCrop();

    expect(engine.block.getPosition(blockId).x).toBe(42);
    expect(engine.block.getFillImage(blockId)?.scale).toBe(1);
    expect(engine.editor.canUndo()).toBe(false);

    engine.editor.setEditMode("Crop", { blockId });
    engine.editor.updateImageFillCrop({ scale: 1.5 });
    engine.editor.setEditMode("Transform");

    expect(engine.block.getFillImage(blockId)?.scale).toBe(1);
    expect(engine.editor.canUndo()).toBe(false);
    expect(renderer.hideImageFillCropPreview).toHaveBeenCalledTimes(2);
  });

  it("publishes typed preview changes and supports unsubscribe", () => {
    const blockId = createGraphic();
    const listener = vi.fn();
    const unsubscribe = engine.editor.onImageFillCropChanged(listener);
    engine.editor.setEditMode("Crop", { blockId });
    listener.mockClear();

    engine.editor.updateImageFillCrop({ scale: 2 });
    expect(listener).toHaveBeenCalledWith({
      blockId,
      crop: expect.objectContaining({ scale: 2, rotation: 90 }),
    });

    unsubscribe();
    engine.editor.updateImageFillCrop({ scale: 3 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("keeps standalone image crop on the legacy overlay", () => {
    const blockId = engine.block.create("image");
    engine.block.setSize(blockId, 200, 100);
    engine.clearHistory();

    engine.editor.setEditMode("Crop", { blockId });

    expect(renderer.showCropOverlay).toHaveBeenCalled();
    expect(renderer.showImageFillCropPreview).not.toHaveBeenCalled();
  });
});
