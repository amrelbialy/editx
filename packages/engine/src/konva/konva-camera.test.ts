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

describe("KonvaCamera continuous navigation bounds", () => {
  it.each([
    {
      name: "vertical",
      union: { width: 600, height: 848 },
      range: { minX: 300, maxX: 300, minY: 150, maxY: 598 },
      frames: [
        { x: 100, y: 0, width: 400, height: 300 },
        { x: 0, y: 348, width: 600, height: 500 },
      ],
    },
    {
      name: "horizontal",
      union: { width: 1048, height: 500 },
      range: { minX: 200, maxX: 748, minY: 250, maxY: 250 },
      frames: [
        { x: 0, y: 100, width: 400, height: 300 },
        { x: 448, y: 0, width: 600, height: 500 },
      ],
    },
  ])("centers and pads the first and last $name pages", ({ union, range, frames }) => {
    const cam = makeCamera(800, 600);
    cam.setPageNavigationBounds(union.width, union.height, range);

    for (const frame of frames) {
      cam.fitToRect(frame, 24);
      const center = cam.worldToScreen({
        x: frame.x + frame.width / 2,
        y: frame.y + frame.height / 2,
      });
      expect(center.x).toBeCloseTo(400);
      expect(center.y).toBeCloseTo(300);
      const topLeft = cam.worldToScreen({ x: frame.x, y: frame.y });
      const bottomRight = cam.worldToScreen({
        x: frame.x + frame.width,
        y: frame.y + frame.height,
      });
      expect(topLeft.x).toBeGreaterThanOrEqual(24);
      expect(topLeft.y).toBeGreaterThanOrEqual(24);
      expect(bottomRight.x).toBeLessThanOrEqual(776 + 1e-9);
      expect(bottomRight.y).toBeLessThanOrEqual(576 + 1e-9);
    }
  });

  it("restores strict legacy edge clamping when setPageSize is used", () => {
    const cam = makeCamera(800, 600);
    cam.setPageNavigationBounds(400, 1000, {
      minX: 200,
      maxX: 200,
      minY: 100,
      maxY: 900,
    });
    cam.setPageSize(400, 1000);
    cam.centerOnRect({ x: 0, y: 0, width: 400, height: 200 });
    expect(cam.getPan().y).toBe(0);
  });
});

describe("KonvaCamera animation interruption", () => {
  it("cancels in-flight animation before synchronous zoom, pan, and fit", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const cancel = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", cancel);
    try {
      const cam = makeCamera();
      const interrupt = (mutation: () => void) => {
        cam.setZoom(2, true);
        expect(frames.size).toBe(1);
        mutation();
        expect(frames.size).toBe(0);
      };
      interrupt(() => cam.setZoom(1.5));
      interrupt(() => cam.panTo(120, -80));
      interrupt(() => cam.fitToRect({ x: 20, y: 30, width: 200, height: 100 }));
      expect(cancel).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("dispose invalidates queued frames and suppresses stale camera callbacks", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    try {
      const cam = makeCamera();
      const onZoom = vi.fn();
      const onPan = vi.fn();
      cam.setZoomChangeListener(onZoom);
      cam.setPanChangeListener(onPan);
      cam.setZoom(2, true);
      const staleFrame = [...frames.values()][0];

      cam.dispose();
      expect(frames.size).toBe(0);
      staleFrame?.(performance.now() + 100);

      expect(frames.size).toBe(0);
      expect(onZoom).not.toHaveBeenCalled();
      expect(onPan).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
