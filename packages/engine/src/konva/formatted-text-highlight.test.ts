/**
 * @vitest-environment happy-dom
 *
 * Run-level highlight "pill": per-run backgroundColor renders behind the
 * glyphs with optional explicit padding/radius (unset = 0), not as a bare
 * full-line rectangle.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextRun } from "../block/block.types";
import { renderFormattedText, type TextRenderConfig } from "./formatted-text-render";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

const { fakeCtx } = vi.hoisted(() => ({
  fakeCtx: {
    font: "",
    measureText: (t: string) => ({ width: t.length * 10 }),
  } as unknown as CanvasRenderingContext2D,
}));

vi.mock("./formatted-text-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./formatted-text-utils")>();
  return { ...actual, getDummyContext: () => fakeCtx };
});

import { computeTextLines } from "./formatted-text-layout";

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
  it("draws an unpadded square box by default", () => {
    const fontSize = 20;
    const partWidth = 30;
    const { ctx, calls } = makeCtx(true);

    renderFormattedText(ctx, [makeLine(fontSize, partWidth)], CONFIG);

    expect(calls.roundRect).toContainEqual([10, 10, 30, 20, 0]);
    // The pill must NOT be a bare full-line fillRect anymore.
    expect(calls.fillRect).toHaveLength(0);
  });

  it("allows explicit padding to bleed beyond the text bounds", () => {
    const style = resolveStyle({
      fontSize: 20,
      fontFamily: "Arial",
      backgroundColor: "#ff0",
      backgroundCornerRadius: 3,
      backgroundPadding: { top: 2, right: 5, bottom: 6, left: 14 },
    });
    const line: TextLine = {
      parts: [{ text: "Hi", style, width: 30 }],
      width: 30,
      height: 24,
    };
    const { ctx, calls } = makeCtx(true);

    renderFormattedText(ctx, [line], CONFIG);

    expect(calls.roundRect).toContainEqual([-4, 8, 49, 28, 3]);
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

describe("computeTextLines run splitting on per-run highlight fields", () => {
  const layoutConfig = { width: 400, padding: 0, wrap: "none", lineHeight: 1.2, plainText: "HiYo" };

  it("splits adjacent runs sharing backgroundColor but differing in backgroundOpacity", () => {
    const runs: TextRun[] = [
      { text: "Hi", style: { fontSize: 20, backgroundColor: "#ff0", backgroundOpacity: 0.5 } },
      { text: "Yo", style: { fontSize: 20, backgroundColor: "#ff0", backgroundOpacity: 0.8 } },
    ];

    const lines = computeTextLines(runs, layoutConfig);

    expect(lines).toHaveLength(1);
    expect(lines[0].parts.map((p) => p.text)).toEqual(["Hi", "Yo"]);
  });

  it("splits adjacent runs sharing backgroundColor but differing in backgroundCornerRadius", () => {
    const runs: TextRun[] = [
      { text: "Hi", style: { fontSize: 20, backgroundColor: "#ff0", backgroundCornerRadius: 2 } },
      { text: "Yo", style: { fontSize: 20, backgroundColor: "#ff0", backgroundCornerRadius: 8 } },
    ];

    const lines = computeTextLines(runs, layoutConfig);

    expect(lines[0].parts.map((p) => p.text)).toEqual(["Hi", "Yo"]);
  });

  it("splits adjacent runs sharing backgroundColor but differing in backgroundPadding", () => {
    const runs: TextRun[] = [
      {
        text: "Hi",
        style: { fontSize: 20, backgroundColor: "#ff0", backgroundPadding: { top: 2 } },
      },
      {
        text: "Yo",
        style: { fontSize: 20, backgroundColor: "#ff0", backgroundPadding: { top: 6 } },
      },
    ];

    const lines = computeTextLines(runs, layoutConfig);

    expect(lines[0].parts.map((p) => p.text)).toEqual(["Hi", "Yo"]);
  });

  it("merges adjacent runs into one part when every field, incl. the new ones, matches", () => {
    const runs: TextRun[] = [
      { text: "Hi", style: { fontSize: 20, backgroundColor: "#ff0", backgroundOpacity: 0.5 } },
      { text: "Yo", style: { fontSize: 20, backgroundColor: "#ff0", backgroundOpacity: 0.5 } },
    ];

    const lines = computeTextLines(runs, layoutConfig);

    expect(lines[0].parts.map((p) => p.text)).toEqual(["HiYo"]);
  });
});
