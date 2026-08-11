/**
 * @vitest-environment happy-dom
 *
 * Run-level highlight "pill": the per-run backgroundColor must render as a
 * padded, rounded box (padX=0.2·fontSize, padY=0.1·fontSize, radius=0.15·fontSize)
 * that hugs the glyphs — not a bare full-line rectangle. The image-editor preview
 * mirrors these exact em ratios.
 */

import { describe, expect, it, vi } from "vitest";
import { renderFormattedText, type TextRenderConfig } from "./formatted-text-render";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

function makeCtx(withRoundRect: boolean) {
  const calls = {
    roundRect: [] as number[][],
    arcTo: [] as number[][],
    fillRect: [] as number[][],
    fills: 0,
  };
  const ctx = {
    font: "",
    fillStyle: "" as string | CanvasGradient,
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "" as CanvasLineJoin,
    textBaseline: "" as CanvasTextBaseline,
    textAlign: "" as CanvasTextAlign,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(() => {
      calls.fills++;
    }),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      calls.fillRect.push([x, y, w, h]);
    }),
    arcTo: vi.fn((x1: number, y1: number, x2: number, y2: number, r: number) => {
      calls.arcTo.push([x1, y1, x2, y2, r]);
    }),
  } as Record<string, unknown>;
  if (withRoundRect) {
    ctx.roundRect = vi.fn((x: number, y: number, w: number, h: number, r: number) => {
      calls.roundRect.push([x, y, w, h, r]);
    });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

function makeLine(fontSize: number, partWidth: number): TextLine {
  const style = resolveStyle({ fontSize, fontFamily: "Arial", backgroundColor: "#ff0" });
  return {
    parts: [{ text: "Hi", style, width: partWidth }],
    width: partWidth,
    height: fontSize * 1.2,
  };
}

const CONFIG: TextRenderConfig = {
  width: 400,
  height: 100,
  padding: 10,
  align: "left",
  verticalAlign: "top",
};

describe("renderFormattedText highlight pill", () => {
  it("draws a rounded, padded box via roundRect when available", () => {
    const fontSize = 20;
    const partWidth = 30;
    const { ctx, calls } = makeCtx(true);

    renderFormattedText(ctx, [makeLine(fontSize, partWidth)], CONFIG);

    // padX = 4, radius = 3; xOffset = partYOffset = pad = 10.
    // The pill hugs the run's em box: boxX = 10 - 4 = 6, boxY = 10 (glyph top),
    // boxW = 30 + 8 = 38, boxH = fontSize = 20. No upward shift, no bottom gap.
    expect(calls.roundRect).toContainEqual([6, 10, 38, 20, 3]);
    // The pill must NOT be a bare full-line fillRect anymore.
    expect(calls.fillRect).toHaveLength(0);
  });

  it("falls back to an arcTo path when roundRect is unavailable", () => {
    const { ctx, calls } = makeCtx(false);

    renderFormattedText(ctx, [makeLine(20, 30)], CONFIG);

    // Four arcTo calls trace the rounded corners.
    expect(calls.arcTo.length).toBe(4);
    expect(calls.fills).toBeGreaterThan(0);
  });

  it("does not draw a highlight when no backgroundColor is set", () => {
    const style = resolveStyle({ fontSize: 20, fontFamily: "Arial" });
    const line: TextLine = {
      parts: [{ text: "Hi", style, width: 30 }],
      width: 30,
      height: 24,
    };
    const { ctx, calls } = makeCtx(true);

    renderFormattedText(ctx, [line], CONFIG);

    expect(calls.roundRect).toHaveLength(0);
    expect(calls.fillRect).toHaveLength(0);
  });
});
