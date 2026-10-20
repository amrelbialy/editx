import type Konva from "konva";
import { describe, expect, it } from "vitest";
import { KonvaCamera } from "./konva-camera";

function setup(width: number, height: number) {
  const size = { width, height };
  const stage = {
    width: (value?: number) => {
      if (value !== undefined) size.width = value;
      return size.width;
    },
    height: (value?: number) => {
      if (value !== undefined) size.height = value;
      return size.height;
    },
    batchDraw: () => {},
  } as unknown as Konva.Stage;
  const layer = () =>
    ({
      scale: () => {},
      position: () => {},
    }) as unknown as Konva.Layer;
  return { camera: new KonvaCamera(stage, layer(), layer()), size };
}

describe("KonvaCamera initial viewport resize", () => {
  it("keeps an explicit horizontal-page fit centered across the first resize only", () => {
    const { camera, size } = setup(554, 506);
    const cover = { x: 0, y: 80, width: 480, height: 320 };
    const center = { x: 240, y: 240 };

    camera.fitToRect(cover, 24);
    expect(camera.getZoom()).toBeCloseTo(1.0541666667);
    expect(camera.worldToScreen(center)).toEqual({ x: 277, y: 253 });
    camera.preserveCenterOnNextResize();

    // Page-view reconciliation before ResizeObserver fires must not consume
    // the pending center preservation when stage dimensions are unchanged.
    camera.reapplyViewport();
    size.height = 419;
    camera.reapplyViewport();

    expect(camera.getZoom()).toBeCloseTo(1.0541666667);
    expect(camera.worldToScreen(center).x).toBeCloseTo(277);
    expect(camera.worldToScreen(center).y).toBeCloseTo(209.5);

    const fittedPan = camera.getPan();
    size.height = 500;
    camera.reapplyViewport();
    expect(camera.getPan()).toEqual(fittedPan);
  });
});
