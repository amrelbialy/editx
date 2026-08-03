import type Konva from "konva";
import { beforeEach, describe, expect, it } from "vitest";
import { KonvaCamera } from "./konva-camera";

/**
 * Minimal fakes for the only Konva surface KonvaCamera touches:
 * `stage.width()/height()/batchDraw()` and `layer.scale()/position()`.
 * No real canvas is created — these are pure math unit tests.
 */
function makeStage(width: number, height: number): Konva.Stage {
  return {
    width: () => width,
    height: () => height,
    batchDraw: () => {},
  } as unknown as Konva.Stage;
}

function makeLayer(): Konva.Layer {
  return {
    scale: () => {},
    position: () => {},
  } as unknown as Konva.Layer;
}

function makeCamera(stageW = 800, stageH = 600): KonvaCamera {
  return new KonvaCamera(makeStage(stageW, stageH), makeLayer(), makeLayer());
}

/** Set the camera to a known zoom + pan without triggering clamp logic. */
function setState(cam: KonvaCamera, zoom: number, panX: number, panY: number): void {
  // setZoom sets #zoom then recomputes pan; panTo overrides pan with no clamp
  // (no page size is registered here, so clamp would be a no-op regardless).
  cam.setZoom(zoom);
  cam.panTo(panX, panY);
}

const TOLERANCE = 1e-9;

const ZOOMS = [0.1, 0.25, 0.5, 1, 2, 4, 10];
const PANS: Array<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: 120, y: 0 }, // panned right
  { x: -120, y: 0 }, // panned left
  { x: 0, y: 90 }, // panned down
  { x: 0, y: -90 }, // panned up
  { x: 250, y: 175 }, // combined +/+
  { x: -250, y: -175 }, // combined -/-
  { x: 333.33, y: -412.7 }, // non-integer offsets
];

const PROBE_POINTS: Array<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: 400, y: 300 },
  { x: -137.5, y: 642.25 },
  { x: 1000, y: -1000 },
];

describe("KonvaCamera coordinate round-trips", () => {
  let cam: KonvaCamera;

  beforeEach(() => {
    cam = makeCamera();
  });

  it("screenToWorld(worldToScreen(pt)) === pt across zoom/pan permutations", () => {
    for (const zoom of ZOOMS) {
      for (const pan of PANS) {
        setState(cam, zoom, pan.x, pan.y);
        for (const pt of PROBE_POINTS) {
          const screen = cam.worldToScreen(pt);
          const back = cam.screenToWorld(screen);
          expect(back.x).toBeCloseTo(pt.x, 6);
          expect(back.y).toBeCloseTo(pt.y, 6);
          expect(Math.abs(back.x - pt.x)).toBeLessThan(TOLERANCE + Math.abs(pt.x) * 1e-9);
          expect(Math.abs(back.y - pt.y)).toBeLessThan(TOLERANCE + Math.abs(pt.y) * 1e-9);
        }
      }
    }
  });

  it("worldToScreen(screenToWorld(pt)) === pt across zoom/pan permutations", () => {
    for (const zoom of ZOOMS) {
      for (const pan of PANS) {
        setState(cam, zoom, pan.x, pan.y);
        for (const pt of PROBE_POINTS) {
          const world = cam.screenToWorld(pt);
          const back = cam.worldToScreen(world);
          expect(back.x).toBeCloseTo(pt.x, 6);
          expect(back.y).toBeCloseTo(pt.y, 6);
        }
      }
    }
  });

  it("applies the expected affine transform at a known state", () => {
    // zoom 2, pan (100, 50): screen = world * 2 + pan
    setState(cam, 2, 100, 50);
    expect(cam.worldToScreen({ x: 10, y: 20 })).toEqual({ x: 120, y: 90 });
    expect(cam.screenToWorld({ x: 120, y: 90 })).toEqual({ x: 10, y: 20 });
  });

  it("round-trips at fractional zoom levels", () => {
    setState(cam, 0.375, -42.5, 17.25);
    const pt = { x: 512, y: 384 };
    const back = cam.screenToWorld(cam.worldToScreen(pt));
    expect(back.x).toBeCloseTo(pt.x, 6);
    expect(back.y).toBeCloseTo(pt.y, 6);
  });

  it("keeps getPan/getZoom consistent with the transform", () => {
    setState(cam, 3, 60, -20);
    expect(cam.getZoom()).toBe(3);
    expect(cam.getPan()).toEqual({ x: 60, y: -20 });
    // origin world point maps to pan
    expect(cam.worldToScreen({ x: 0, y: 0 })).toEqual({ x: 60, y: -20 });
  });
});
