import type Konva from "konva";
import { beforeEach, describe, expect, it } from "vitest";
import { KonvaCamera } from "./konva-camera";

/**
 * Minimal Konva fakes — see konva-camera.roundtrip.test.ts for rationale.
 * Only stage.width()/height()/batchDraw() and layer.scale()/position() are used.
 */
function makeStage(width: number, height: number): Konva.Stage {
  return {
    width: () => width,
    height: () => height,
    batchDraw: () => {},
  } as unknown as Konva.Stage;
}

function makeLayer(): Konva.Layer {
  return { scale: () => {}, position: () => {} } as unknown as Konva.Layer;
}

const STAGE_W = 800;
const STAGE_H = 600;

function makeCamera(): KonvaCamera {
  return new KonvaCamera(makeStage(STAGE_W, STAGE_H), makeLayer(), makeLayer());
}

/**
 * Drive the private #clampPan through its only public entry point.
 *
 * NOTE: In the current implementation clamp logic is reachable *only* via
 * `zoomAtPoint`. `panTo`, `setZoom`, `setPageSize`, `fitToScreen`, etc. do NOT
 * clamp. When the requested zoom equals the current zoom, `zoomAtPoint`
 * preserves the existing pan (worldPt * zoom cancels), so this lets us seed an
 * arbitrary pan via `panTo` and then observe the clamp in isolation.
 */
function clampCurrentPan(cam: KonvaCamera): { x: number; y: number } {
  cam.zoomAtPoint(cam.getZoom(), { x: 0, y: 0 });
  return cam.getPan();
}

describe("KonvaCamera pan clamping", () => {
  let cam: KonvaCamera;

  beforeEach(() => {
    cam = makeCamera();
  });

  describe("page smaller than viewport → centered", () => {
    it("centers a small page regardless of the requested pan", () => {
      cam.setPageSize(200, 100); // 200x100 world @ zoom 1 → 200x100 screen
      cam.panTo(9999, -9999); // absurd pan should be ignored
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe((STAGE_W - 200) / 2); // 300
      expect(pan.y).toBe((STAGE_H - 100) / 2); // 250
    });

    it("centers independently on each axis (wide-but-short page)", () => {
      // width 2000 > 800 (clamped), height 100 <= 600 (centered)
      cam.setPageSize(2000, 100);
      cam.panTo(-5000, 4000);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(STAGE_W - 2000 * 1); // -1200 (clamped to min)
      expect(pan.y).toBe((STAGE_H - 100) / 2); // 250 (centered)
    });
  });

  describe("page exactly fitting viewport", () => {
    it("treats an exactly-fitting page as centered at 0 (<= boundary)", () => {
      cam.setPageSize(STAGE_W, STAGE_H); // 800x600 == viewport
      cam.panTo(999, 999);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(0);
      expect(pan.y).toBe(0);
    });

    it("centers a page one pixel smaller than the viewport", () => {
      cam.setPageSize(STAGE_W - 1, STAGE_H - 1);
      cam.panTo(500, 500);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(0.5); // (800 - 799) / 2
      expect(pan.y).toBe(0.5);
    });
  });

  describe("page larger than viewport → edges clamped", () => {
    beforeEach(() => {
      cam.setPageSize(2000, 1500); // @ zoom 1 → 2000x1500 screen
    });

    it("clamps pan so page cannot over-scroll past the top-left", () => {
      // maxX = 0, maxY = 0 (page's top-left cannot move past viewport top-left)
      cam.panTo(5000, 5000);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(0);
      expect(pan.y).toBe(0);
    });

    it("clamps pan so page cannot over-scroll past the bottom-right", () => {
      // minX = stageW - pageW = 800 - 2000 = -1200
      // minY = stageH - pageH = 600 - 1500 = -900
      cam.panTo(-5000, -5000);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(STAGE_W - 2000); // -1200
      expect(pan.y).toBe(STAGE_H - 1500); // -900
    });

    it("preserves an interior pan that is already within bounds", () => {
      cam.panTo(-600, -400); // inside [-1200,0] x [-900,0]
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(-600);
      expect(pan.y).toBe(-400);
    });

    it("clamps exactly at the min edge without overshoot", () => {
      cam.panTo(-1200, -900);
      const pan = clampCurrentPan(cam);
      expect(pan.x).toBe(-1200);
      expect(pan.y).toBe(-900);
    });
  });

  describe("zoom participates in clamp bounds", () => {
    it("uses zoom-scaled page size when deciding center vs clamp", () => {
      // 800x600 page @ zoom 2 → 1600x1200 screen (larger than viewport → clamp)
      cam.setPageSize(STAGE_W, STAGE_H);
      // zoomAtPoint centered on viewport middle: worldPt maps back cleanly.
      cam.zoomAtPoint(2, { x: STAGE_W / 2, y: STAGE_H / 2 });
      const pan = cam.getPan();
      // pre-clamp pan = 400 - 400*2 = -400 (x), 300 - 300*2 = -300 (y)
      // bounds: minX = 800-1600 = -800, minY = 600-1200 = -600 → both interior
      expect(pan.x).toBe(-400);
      expect(pan.y).toBe(-300);
    });

    it("recenters when zooming out makes the page smaller than the viewport", () => {
      cam.setPageSize(1000, 1000);
      cam.panTo(-100, -100);
      // zoom 0.5 → 500x500 screen, both < viewport → centered
      cam.zoomAtPoint(0.5, { x: 0, y: 0 });
      const pan = cam.getPan();
      expect(pan.x).toBe((STAGE_W - 500) / 2); // 150
      expect(pan.y).toBe((STAGE_H - 500) / 2); // 50
    });
  });

  describe("no page size registered", () => {
    it("does not clamp when setPageSize was never called", () => {
      cam.panTo(5000, 5000);
      // zoomAtPoint with same zoom preserves pan; #clampPan is a no-op.
      cam.zoomAtPoint(1, { x: 0, y: 0 });
      expect(cam.getPan()).toEqual({ x: 5000, y: 5000 });
    });
  });
});
