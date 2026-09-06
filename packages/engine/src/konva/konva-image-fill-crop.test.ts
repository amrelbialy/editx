import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import {
  INITIAL_IMAGE_FILL_CROP as INITIAL,
  imagePlanePolygon,
  setupImageFillCrop as setup,
} from "./konva-image-fill-crop.test-utils";

describe("KonvaImageFillCrop", () => {
  it("shows the dedicated crop overlay and restores node state", () => {
    const { crop, node, cropOverlay } = setup();
    node.setAttrs({ scaleX: 1.5, scaleY: 0.75, rotation: 30 });

    crop.show(7, INITIAL);

    expect(cropOverlay.setRatio).toHaveBeenCalledWith(null);
    expect(cropOverlay.showBlock).toHaveBeenCalledWith(
      expect.not.objectContaining({ attrs: expect.objectContaining({ draggable: true }) }),
      expect.objectContaining({
        onStart: expect.any(Function),
        onChange: expect.any(Function),
        onEnd: expect.any(Function),
      }),
    );
    expect(node.draggable()).toBe(true);
    expect(node.visible()).toBe(false);

    crop.hide();
    expect(cropOverlay.hide).toHaveBeenCalledTimes(1);
    expect(node.draggable()).toBe(true);
    expect(node.visible()).toBe(true);
    expect(node.scale()).toEqual({ x: 1.5, y: 0.75 });
    expect(node.position()).toEqual({ x: 0, y: 0 });
    expect(node.size()).toEqual({ width: INITIAL.width, height: INITIAL.height });
    expect(node.rotation()).toBe(30);
  });

  it.each([
    "crop",
    "cover",
    "fit",
    "tile",
  ] as const)("previews %s using the cached processed source", (mode) => {
    const { crop, node, preview } = setup();
    const source = node.getAttr("__fillPatternSource");

    crop.show(7, { ...INITIAL, mode, rotation: 90, flipHorizontal: true });

    const previewNode = preview();
    const plane = previewNode.getParent()?.findOne(".image-fill-crop-plane") as Konva.Image;
    expect(previewNode.fillPatternImage()).toEqual(source);
    expect(mode === "tile" ? previewNode.fillPatternImage() : plane.image()).toEqual(source);
    expect(previewNode.fillPriority()).toBe(mode === "tile" ? "pattern" : "color");
    expect(plane.visible()).toBe(mode !== "tile");
    expect(previewNode.fill()).toBe("rgba(0,0,0,0)");
    expect(previewNode.fillPatternRepeat()).toBe(mode === "tile" ? "repeat" : "no-repeat");
    expect(previewNode.fillPatternRotation()).toBe(90);
    expect(previewNode.fillPatternScale().x).toBeLessThan(0);
    expect(previewNode.fillPatternX()).toBe(100);
    expect(previewNode.fillPatternY()).toBe(50);
    expect(node.fillPatternImage()).toBeUndefined();
  });

  it("switches mode preview surfaces without waiting for crop to close", () => {
    const { crop, preview } = setup();
    crop.show(7, INITIAL);
    const previewNode = preview();
    const plane = previewNode.getParent()?.findOne(".image-fill-crop-plane") as Konva.Image;

    crop.set({ ...INITIAL, mode: "tile" });
    expect(previewNode.fillPriority()).toBe("pattern");
    expect(previewNode.fillPatternRepeat()).toBe("repeat");
    expect(plane.visible()).toBe(false);

    crop.set({ ...INITIAL, mode: "fit" });
    expect(previewNode.fillPriority()).toBe("color");
    expect(plane.visible()).toBe(true);

    crop.set({ ...INITIAL, mode: "fit", alignment: "bottom-right" });
    expect(previewNode.fillPatternX()).toBeGreaterThan(100);
  });

  it("reapplies the latest preview after a pending image load", async () => {
    const { crop, node, onChange, preview } = setup(false);
    let resolveReady = () => {};
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    crop.show(7, INITIAL);
    const previewNode = preview();
    const rotationSpy = vi.spyOn(previewNode, "fillPatternRotation");
    node.setAttr("__fillImageReady", ready);
    crop.set({ ...INITIAL, rotation: 90 });
    crop.set({
      ...INITIAL,
      mode: "tile",
      scale: 2,
      rotation: 180,
      flipHorizontal: true,
      flipVertical: true,
    });
    node.setAttr("__fillPatternSource", { width: 400, height: 200 });
    previewNode.fillPatternRotation(0);
    const setterCalls = rotationSpy.mock.calls.filter((args) => args.length > 0).length;
    resolveReady();
    await ready;

    expect(previewNode.fillPatternRotation()).toBe(180);
    expect(previewNode.fillPatternRepeat()).toBe("repeat");
    expect(previewNode.fillPatternScale()).toEqual({ x: -2, y: -2 });
    expect(rotationSpy.mock.calls.filter((args) => args.length > 0)).toHaveLength(setterCalls + 1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sourceAspectRatio: 2 }));
  });

  it("uses inverse absolute pointer deltas for nested rotated graphics", () => {
    const { crop, onChange, setPointer, move, end, style, preview } = setup();
    crop.show(7, INITIAL);
    const previewNode = preview();
    const transform = previewNode.getAbsoluteTransform();
    setPointer(transform.point({ x: 50, y: 50 }));

    previewNode.fire("mousedown", { cancelBubble: false, evt: { button: 0 } });
    setPointer(transform.point({ x: 50, y: 40 }));
    move();

    const cropChange = onChange.mock.calls.at(-1)?.[0];
    expect(cropChange?.offsetX).toBe(0);
    expect(cropChange?.offsetY).toBeCloseTo(40);
    expect(style.cursor).toBe("grabbing");
    end();
    expect(style.cursor).toBe("grab");
  });

  it("captures frame transforms without replacing image rotation", () => {
    const { crop, node, onChange, cropOverlay, preview } = setup();
    crop.show(7, { ...INITIAL, rotation: 90 });
    crop.set({ ...INITIAL, width: 100, height: 100, rotation: 90 }, 1);

    expect(cropOverlay.setRatio).toHaveBeenLastCalledWith(1);
    expect(crop.captureTransform(7, { x: 2, y: 3, width: 80, height: 80, rotation: 45 })).toBe(
      true,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ x: 2, width: 80, rotation: 90 }),
    );
    expect(preview().width()).toBe(80);
    expect(preview().height()).toBe(80);
    expect(cropOverlay.setBlockFrame).toHaveBeenCalledWith(
      expect.objectContaining({ x: 2, y: 3, width: 80, height: 80 }),
    );
    expect(node.width()).toBe(200);
    expect(node.height()).toBe(100);
    expect(node.scale()).toEqual({ x: 1, y: 1 });
    expect(cropOverlay.refreshBlock).toHaveBeenCalled();
  });

  it("normalizes the final Crop frame once before the first post-resize drag", () => {
    const { crop, cropOverlay, onChange, applyFrame, preview, setPointer, move } = setup();
    crop.show(7, INITIAL);
    const callbacks = vi.mocked(cropOverlay.showBlock).mock.calls[0][1];

    callbacks.onStart?.();
    applyFrame.mockClear();
    callbacks.onChange({ ...INITIAL, height: 150 });
    expect(preview().size()).toEqual({ width: INITIAL.width, height: INITIAL.height });
    const callsBeforeRelease = applyFrame.mock.calls.length;
    callbacks.onEnd?.();

    expect(applyFrame).toHaveBeenCalledTimes(callsBeforeRelease + 1);
    expect(preview().size()).toEqual({ width: INITIAL.width, height: 150 });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ height: 150 }));
    const scaleAfterRelease = preview().fillPatternScale();
    setPointer(preview().getAbsoluteTransform().point({ x: 50, y: 50 }));
    preview().fire("mousedown", { cancelBubble: false, evt: { button: 0 } });
    setPointer(preview().getAbsoluteTransform().point({ x: 60, y: 50 }));
    move();
    expect(preview().fillPatternScale()).toEqual(scaleAfterRelease);
  });

  it("keeps tile repetition filling the pending frame without applying on release", () => {
    const { crop, cropOverlay, applyFrame, preview } = setup();
    crop.show(7, { ...INITIAL, mode: "tile" });
    const callbacks = vi.mocked(cropOverlay.showBlock).mock.calls[0][1];

    callbacks.onStart?.();
    applyFrame.mockClear();
    callbacks.onChange({ ...INITIAL, mode: "tile", height: 150 });
    expect(preview().size()).toEqual({ width: INITIAL.width, height: 150 });
    expect(preview().fillPatternRepeat()).toBe("repeat");
    const callsBeforeRelease = applyFrame.mock.calls.length;
    callbacks.onEnd?.();

    expect(applyFrame).toHaveBeenCalledTimes(callsBeforeRelease);
  });

  it("keeps the finite image plane stationary while the aperture expands", () => {
    const { crop, cropOverlay, preview } = setup();
    crop.show(7, INITIAL);
    const callbacks = vi.mocked(cropOverlay.showBlock).mock.calls[0][1];
    const before = imagePlanePolygon(preview());

    callbacks.onStart?.();
    callbacks.onChange({ ...INITIAL, y: -26, height: 150 });

    const after = imagePlanePolygon(preview());
    for (const [index, point] of after.entries()) {
      expect(point.x).toBeCloseTo(before[index].x, 8);
      expect(point.y).toBeCloseTo(before[index].y, 8);
    }
  });

  it("dismisses only when the dimmed area outside the preview is clicked", () => {
    const { crop, cropOverlay, preview, onDismiss, setPointer, move, end, click } = setup();
    crop.show(7, INITIAL);
    const callbacks = vi.mocked(cropOverlay.showBlock).mock.calls[0][1];

    callbacks.onStart?.();
    callbacks.onChange({ ...INITIAL, width: 100 });
    callbacks.onEnd?.();
    expect(onDismiss).not.toHaveBeenCalled();

    click(preview());
    expect(onDismiss).not.toHaveBeenCalled();

    click(new Konva.Rect());
    expect(onDismiss).not.toHaveBeenCalled();

    vi.mocked(cropOverlay.containsBlockPoint).mockReturnValue(false);
    click(new Konva.Transformer());
    click(new Konva.Rect({ name: "crop-frame-proxy" }));
    expect(onDismiss).not.toHaveBeenCalled();

    preview().fire("mousedown", { cancelBubble: false, evt: { button: 0 } });
    setPointer({ x: 90, y: 100 });
    move();
    end();
    click(new Konva.Rect());
    expect(onDismiss).not.toHaveBeenCalled();

    const polygon = imagePlanePolygon(preview());
    setPointer({
      x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
      y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
    });
    click(new Konva.Rect());
    expect(onDismiss).not.toHaveBeenCalled();

    setPointer({ x: -10_000, y: -10_000 });
    click(new Konva.Rect());
    expect(onDismiss).toHaveBeenCalledOnce();
    click(new Konva.Rect());
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("normalizes finite Crop before the crop preview is shown", () => {
    const { crop } = setup();

    expect(crop.show(7, { ...INITIAL, scale: 0.1, offsetY: 999 })).toMatchObject({
      scale: 1,
      offsetY: 100,
    });
  });
});
