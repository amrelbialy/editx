import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { EditxEngine } from "./editx-engine";
import { KonvaCamera } from "./konva/konva-camera";

/**
 * WI-7a: an event-driven viewport/transform API. Consumers subscribe to
 * pan/zoom/live-transform changes (no polling) and get working unsubscribe
 * functions. Pan notifications are de-duplicated at the camera source so an
 * unchanged pan never re-fires.
 */

describe("EditxEngine viewport/transform events", () => {
  it("onPanChanged fires with the point payload and unsubscribes", () => {
    const engine = new EditxEngine({});
    const cb = vi.fn();
    const unsubscribe = engine.onPanChanged(cb);

    engine.emit("pan:changed", { x: 12, y: 34 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ x: 12, y: 34 });

    unsubscribe();
    engine.emit("pan:changed", { x: 99, y: 99 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onPanChanged ignores non-point payloads (runtime guard)", () => {
    const engine = new EditxEngine({});
    const cb = vi.fn();
    engine.onPanChanged(cb);

    engine.emit("pan:changed", 42);
    expect(cb).not.toHaveBeenCalled();
  });

  it("onZoomChanged fires with the numeric zoom and unsubscribes", () => {
    const engine = new EditxEngine({});
    const cb = vi.fn();
    const unsubscribe = engine.onZoomChanged(cb);

    engine.emit("zoom:changed", 2.5);
    expect(cb).toHaveBeenCalledWith(2.5);

    unsubscribe();
    engine.emit("zoom:changed", 3);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onBlockTransform fires {block, phase} for live drag and resize", () => {
    const engine = new EditxEngine({});
    const cb = vi.fn();
    const unsubscribe = engine.onBlockTransform(cb);

    engine.emit("block:transform", { block: 3, phase: "drag" });
    engine.emit("block:transform", { block: 3, phase: "resize" });

    expect(cb).toHaveBeenNthCalledWith(1, { block: 3, phase: "drag" });
    expect(cb).toHaveBeenNthCalledWith(2, { block: 3, phase: "resize" });

    unsubscribe();
    engine.emit("block:transform", { block: 3, phase: "drag" });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("onBlockTransform ignores malformed payloads", () => {
    const engine = new EditxEngine({});
    const cb = vi.fn();
    engine.onBlockTransform(cb);

    engine.emit("block:transform", { block: 3 });
    expect(cb).not.toHaveBeenCalled();
  });
});

// ── Pan de-dup lives at the camera, before the engine event ever fires ──

function fakeStage(width: number, height: number): Konva.Stage {
  return {
    width: () => width,
    height: () => height,
    batchDraw: () => {},
  } as unknown as Konva.Stage;
}

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

describe("KonvaCamera pan-change de-duplication", () => {
  it("notifies once per real pan change and never for an unchanged pan", () => {
    const cam = new KonvaCamera(fakeStage(1000, 800), fakeLayer(), fakeLayer());
    cam.setPageSize(2000, 1600);
    cam.setZoom(1);

    const cb = vi.fn();
    cam.setPanChangeListener(cb);

    cam.panTo(-100, -100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ x: -100, y: -100 });

    // Same pan again → clamped result is identical → no redundant emit.
    cam.panTo(-100, -100);
    expect(cb).toHaveBeenCalledTimes(1);

    // A genuinely different pan re-fires.
    cam.panTo(-200, -150);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith({ x: -200, y: -150 });
  });
});
