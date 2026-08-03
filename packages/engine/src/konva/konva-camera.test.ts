import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { clampZoom, KonvaCamera, MAX_ZOOM, MIN_ZOOM } from "./konva-camera";

/** Minimal Konva.Stage stub exposing only what KonvaCamera touches. */
function fakeStage(width: number, height: number): Konva.Stage {
  return {
    width: () => width,
    height: () => height,
    batchDraw: () => {},
  } as unknown as Konva.Stage;
}

/** Minimal Konva.Layer stub that records scale/position. */
function fakeLayer(): Konva.Layer {
  const state = { scale: { x: 1, y: 1 }, pos: { x: 0, y: 0 } };
  return {
    scale: (s?: { x: number; y: number }) => {
      if (s) state.scale = s;
      return state.scale;
    },
    position: (p?: { x: number; y: number }) => {
      if (p) state.pos = p;
      return state.pos;
    },
  } as unknown as Konva.Layer;
}

function makeCamera(w = 1000, h = 800) {
  const stage = fakeStage(w, h);
  return new KonvaCamera(stage, fakeLayer(), fakeLayer());
}

describe("clampZoom", () => {
  it("clamps below MIN_ZOOM and above MAX_ZOOM", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(-5)).toBe(MIN_ZOOM);
    expect(clampZoom(999)).toBe(MAX_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});

describe("KonvaCamera zoom clamping", () => {
  it("setZoom clamps to the shared bounds", () => {
    const cam = makeCamera();
    cam.setZoom(1000);
    expect(cam.getZoom()).toBe(MAX_ZOOM);
    cam.setZoom(0.0001);
    expect(cam.getZoom()).toBe(MIN_ZOOM);
  });

  it("zoomAtPoint clamps to the shared bounds", () => {
    const cam = makeCamera();
    cam.zoomAtPoint(500, { x: 100, y: 100 });
    expect(cam.getZoom()).toBe(MAX_ZOOM);
  });

  it("notifies the zoom-change listener only when zoom changes", () => {
    const cam = makeCamera();
    const cb = vi.fn();
    cam.setZoomChangeListener(cb);
    cam.setZoom(2);
    expect(cb).toHaveBeenCalledWith(2);
    cb.mockClear();
    // Pan only — zoom unchanged, should not notify.
    cam.panTo(10, 10);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("KonvaCamera pan clamping", () => {
  it("centers a page smaller than the viewport", () => {
    const cam = makeCamera(1000, 800);
    cam.setPageSize(400, 300); // page smaller than viewport at zoom 1
    cam.setZoom(1);
    cam.panTo(9999, 9999);
    const pan = cam.getPan();
    expect(pan.x).toBe((1000 - 400) / 2);
    expect(pan.y).toBe((800 - 300) / 2);
  });

  it("clamps pan to edges when the page is larger than the viewport", () => {
    const cam = makeCamera(1000, 800);
    cam.setPageSize(2000, 1600);
    cam.setZoom(1);
    cam.panTo(500, 500); // would reveal empty space past the top-left edge
    const pan = cam.getPan();
    expect(pan.x).toBeLessThanOrEqual(0);
    expect(pan.y).toBeLessThanOrEqual(0);
    expect(pan.x).toBeGreaterThanOrEqual(1000 - 2000);
    expect(pan.y).toBeGreaterThanOrEqual(800 - 1600);
  });

  it("reapplyViewport re-clamps after a stage-size change", () => {
    const cam = makeCamera(1000, 800);
    cam.setPageSize(400, 300);
    cam.setZoom(1);
    cam.reapplyViewport();
    const pan = cam.getPan();
    expect(pan.x).toBe(300);
    expect(pan.y).toBe(250);
  });
});
