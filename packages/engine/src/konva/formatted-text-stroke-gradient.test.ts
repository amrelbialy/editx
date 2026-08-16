/** @vitest-environment node */

import { describe, expect, it, vi } from "vitest";
import type { StrokeGradient } from "../block/block.types";
import { type DrawablePart, drawPartText } from "./formatted-text-draw-run";

const GRADIENT: StrokeGradient = {
  type: "linear",
  angle: 0,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#0000ff" },
  ],
};

function makePart(overrides: Partial<DrawablePart["style"]> = {}): DrawablePart {
  return {
    width: 100,
    style: {
      letterSpacing: 0,
      textStrokeColor: "#111111",
      textStrokeWidth: 3,
      textStrokeGradient: GRADIENT,
      fill: "#ffffff",
      fontSize: 20,
      ...overrides,
    },
  };
}

function makeContext() {
  const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  const createLinearGradient = vi.fn(() => gradient);
  const calls: string[] = [];
  let strokeStyle: string | CanvasGradient = "";
  const ctx = {
    createLinearGradient,
    strokeText: vi.fn(() => calls.push("stroke")),
    fillText: vi.fn(() => calls.push("fill")),
    measureText: vi.fn(() => ({ width: 10 })),
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(value: string | CanvasGradient) {
      strokeStyle = value;
    },
    fillStyle: "",
    lineWidth: 0,
    lineJoin: "miter",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, gradient, createLinearGradient, calls, getStrokeStyle: () => strokeStyle };
}

describe("text stroke gradients", () => {
  it("builds a run-local flat gradient and strokes before filling", () => {
    const spy = makeContext();
    drawPartText(spy.ctx, "Hi", makePart(), 10, 20, false);

    expect(spy.createLinearGradient).toHaveBeenCalledWith(10, 30, 110, 30);
    expect(spy.getStrokeStyle()).toBe(spy.gradient);
    expect(spy.calls).toEqual(["stroke", "fill"]);
  });

  it("falls back to solid for empty gradients", () => {
    const spy = makeContext();
    drawPartText(
      spy.ctx,
      "Hi",
      makePart({ textStrokeGradient: { ...GRADIENT, stops: [] } }),
      0,
      0,
      false,
    );

    expect(spy.createLinearGradient).not.toHaveBeenCalled();
    expect(spy.getStrokeStyle()).toBe("#111111");
  });

  it("never builds curved gradients and uses solid or the first stop", () => {
    const solidSpy = makeContext();
    drawPartText(solidSpy.ctx, "H", makePart(), 0, 0, false, false);
    expect(solidSpy.createLinearGradient).not.toHaveBeenCalled();
    expect(solidSpy.getStrokeStyle()).toBe("#111111");

    const stopSpy = makeContext();
    drawPartText(stopSpy.ctx, "H", makePart({ textStrokeColor: "" }), 0, 0, false, false);
    expect(stopSpy.createLinearGradient).not.toHaveBeenCalled();
    expect(stopSpy.getStrokeStyle()).toBe("#ff0000");
  });
});
