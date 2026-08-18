import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { getBlockCropOverlayGeometry, KonvaCropOverlayBlock } from "./konva-crop-overlay-block";
import { getBlockCropProxyFrame } from "./konva-crop-overlay-block-frame";

describe("getBlockCropOverlayGeometry", () => {
  it("maps a nested rotated frame into UI space without duplicating the camera", () => {
    const camera = { x: 120, y: 80, scaleX: 1.5, scaleY: 1.5 };
    const uiLayer = new Konva.Group(camera);
    const contentLayer = new Konva.Group(camera);
    const parent = new Konva.Group({ x: 45, y: 30, rotation: 25, scaleX: 1.2, scaleY: 0.8 });
    const node = new Konva.Rect({ x: 12, y: 18, width: 200, height: 100, rotation: 15 });
    const stage = { width: () => 1200, height: () => 800, batchDraw: vi.fn() } as Konva.Stage;
    vi.spyOn(uiLayer, "getStage").mockReturnValue(stage);
    contentLayer.add(parent);
    parent.add(node);

    const geometry = getBlockCropOverlayGeometry(uiLayer as unknown as Konva.Layer, node);
    const visual = new Konva.Group();
    uiLayer.add(visual);
    visual.setAttrs(geometry.transform);

    for (const point of [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 },
    ]) {
      const actual = visual.getAbsoluteTransform().point(point);
      const expected = node.getAbsoluteTransform().point(point);
      expect(actual.x).toBeCloseTo(expected.x, 8);
      expect(actual.y).toBeCloseTo(expected.y, 8);
    }
    expect(geometry.cropRect).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });
});

describe("KonvaCropOverlayBlock", () => {
  it("keeps the transformed proxy frame pending across refreshes", () => {
    const layerGroup = new Konva.Group();
    const layer = Object.assign(layerGroup, { batchDraw: vi.fn() }) as unknown as Konva.Layer;
    const overlayGroup = new Konva.Group();
    const visualGroup = new Konva.Group();
    const cutout = new Konva.Rect();
    const gridLines = new Konva.Group();
    const transformer = new Konva.Transformer();
    overlayGroup.add(visualGroup, transformer);
    layerGroup.add(overlayGroup);
    const node = new Konva.Rect({ x: 12, y: 24, width: 200, height: 100 });
    new Konva.Group().add(node);
    const onChange = vi.fn();
    const block = new KonvaCropOverlayBlock(
      layer,
      overlayGroup,
      visualGroup,
      cutout,
      gridLines,
      transformer,
      vi.fn(),
    );

    block.show(node, { onChange });
    const proxy = transformer.nodes()[0] as Konva.Rect;
    proxy.fire("transformstart");
    proxy.setAttrs({ x: 22, y: 34, scaleX: 0.5, scaleY: 0.75 });
    proxy.fire("transform");
    proxy.fire("transformend");
    block.refresh();

    expect(getBlockCropProxyFrame(proxy, node)).toEqual({
      x: 22,
      y: 34,
      width: 100,
      height: 75,
    });
    expect(onChange).toHaveBeenLastCalledWith({ x: 22, y: 34, width: 100, height: 75 });
  });
});
