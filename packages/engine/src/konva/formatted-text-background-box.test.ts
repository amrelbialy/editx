/**
 * @vitest-environment happy-dom
 *
 * Composition of the text background box with everything else the text path
 * paints. The ratified order is:
 *   box shadow → box fill → box stroke → run pills → glyph shadow → glyph
 *   stroke → glyph fill → decoration
 * and the box's shadow must be cleared before the pills so they can't inherit
 * it. Legacy `fill/enabled` behaviour must be untouched.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";
import { renderFormattedText, type TextRenderConfig } from "./formatted-text-render";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

interface Op {
  op: string;
  args: number[];
  fillStyle: string;
  shadow: [string, number, number, number];
}

function makeCtx() {
  const ops: Op[] = [];
  let pending: number[] = [];

  const ctx = {
    font: "",
    fillStyle: "" as string,
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
    arcTo: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    roundRect: vi.fn((...args: number[]) => {
      pending = args;
    }),
    fill: vi.fn(() => record("roundFill", pending)),
    stroke: vi.fn(() => record("roundStroke", pending)),
    fillRect: vi.fn((...args: number[]) => record("fillRect", args)),
    fillText: vi.fn(() => record("fillText", [])),
    strokeText: vi.fn(() => record("strokeText", [])),
  } as unknown as CanvasRenderingContext2D & { fillStyle: string };

  function record(op: string, args: number[]) {
    ops.push({
      op,
      args,
      fillStyle: ctx.fillStyle,
      shadow: [ctx.shadowColor, ctx.shadowBlur, ctx.shadowOffsetX, ctx.shadowOffsetY],
    });
  }

  return { ctx, ops };
}

function line(over: Record<string, unknown> = {}, width = 100): TextLine {
  const style = resolveStyle({ fontSize: 20, fontFamily: "Arial", ...over });
  return { parts: [{ text: "Hi", style, width }], width, height: 24 };
}

/**
 * What `computeTextLines` emits for a run whose text is `""` — one zero-width
 * line with one glyph-less part. This, not `lines === []`, is the shape a block
 * emptied while editing actually renders with.
 */
function emptyLine(): TextLine {
  const style = resolveStyle({ fontSize: 20, fontFamily: "Arial" });
  return { parts: [{ text: "", style, width: 0 }], width: 0, height: 24 };
}

const CONFIG: TextRenderConfig = {
  width: 400,
  height: 200,
  padding: 10,
  align: "left",
  verticalAlign: "top",
};

function box(over: Partial<TextBackgroundBoxStyle> = {}): TextBackgroundBoxStyle {
  return {
    color: "#0000ff",
    cornerRadius: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    shadow: null,
    stroke: null,
    ...over,
  };
}

describe("renderFormattedText — background box composition", () => {
  it("paints the box beneath the run pill and the glyphs", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line({ backgroundColor: "#ffff00" })], {
      ...CONFIG,
      backgroundBox: box(),
    });

    expect(ops.map((o) => o.op)).toEqual(["roundFill", "roundFill", "fillText"]);
    // First rounded fill is the union box (x=10, y=10, w=100, h=20)…
    expect(ops[0].args).toEqual([10, 10, 100, 20, 0]);
    expect(ops[0].fillStyle).toBe("#0000ff");
    // …the second is the run pill, whose geometry is unchanged: padX = 0.2·fs,
    // radius = 0.15·fs, anchored to the em box.
    expect(ops[1].args).toEqual([6, 10, 108, 20, 3]);
    expect(ops[1].fillStyle).toBe("#ffff00");
  });

  it("does not let the run pill inherit the box shadow", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line({ backgroundColor: "#ffff00" })], {
      ...CONFIG,
      backgroundBox: box({ shadow: { color: "#123456", blur: 6, offsetX: 2, offsetY: 4 } }),
    });

    expect(ops[0].shadow).toEqual(["#123456", 6, 2, 4]);
    for (const op of ops.slice(1)) {
      expect(op.shadow).toEqual(["transparent", 0, 0, 0]);
    }
  });

  it("paints the box stroke before the pill", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line({ backgroundColor: "#ffff00" })], {
      ...CONFIG,
      backgroundBox: box({ stroke: { color: "#00ff00", width: 3 } }),
    });

    expect(ops.map((o) => o.op)).toEqual(["roundFill", "roundStroke", "roundFill", "fillText"]);
  });

  it("uses the same offsets for the box and the glyphs (centre + middle)", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], {
      ...CONFIG,
      align: "center",
      verticalAlign: "middle",
      backgroundBox: box(),
    });

    // lineStartX = 10 + (380 - 100) / 2 = 150; textStartY = 10 + (180 - 20)/2 = 90.
    expect(ops[0].args).toEqual([150, 90, 100, 20, 0]);
  });

  it("paints nothing when the box is disabled", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], { ...CONFIG, backgroundBox: null });

    expect(ops.map((o) => o.op)).toEqual(["fillText"]);
  });

  it("paints nothing for empty text, even when enabled", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [], { ...CONFIG, backgroundBox: box() });

    expect(ops).toHaveLength(0);
  });

  it("paints nothing for a block emptied while editing (one zero-width line)", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [emptyLine()], {
      ...CONFIG,
      backgroundBox: box({ padding: { top: 14, right: 14, bottom: 14, left: 14 } }),
    });

    // The empty run is still handed to the glyph painter (a no-op `fillText`),
    // but no box may be painted around it.
    expect(ops.map((o) => o.op)).toEqual(["fillText"]);
  });

  it("paints nothing when negative padding collapses the rect", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], {
      ...CONFIG,
      backgroundBox: box({
        padding: { top: -20, right: -60, bottom: -20, left: -60 },
        shadow: { color: "#000000", blur: 6, offsetX: 0, offsetY: 0 },
        stroke: { color: "#00ff00", width: 3 },
      }),
    });

    expect(ops.map((o) => o.op)).toEqual(["fillText"]);
    // No shadow leaked onto the glyphs either.
    expect(ops[0].shadow).toEqual(["", 0, 0, 0]);
  });
});

describe("renderFormattedText — legacy fill/enabled guarantees", () => {
  it("still paints a square, full-frame background for backgroundFill", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], { ...CONFIG, backgroundFill: "#abcdef" });

    expect(ops[0].op).toBe("fillRect");
    expect(ops[0].args).toEqual([0, 0, 400, 200]);
    expect(ops[0].fillStyle).toBe("#abcdef");
    // No radius, no shadow, no stroke.
    expect(ops[0].shadow).toEqual(["", 0, 0, 0]);
    expect(ops.some((o) => o.op === "roundFill" || o.op === "roundStroke")).toBe(false);
  });

  it("paints the legacy frame beneath the box when both are on", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], {
      ...CONFIG,
      backgroundFill: "#abcdef",
      backgroundBox: box(),
    });

    expect(ops.map((o) => o.op)).toEqual(["fillRect", "roundFill", "fillText"]);
  });

  it("still paints the legacy frame for a block emptied while editing", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [emptyLine()], {
      ...CONFIG,
      backgroundFill: "#abcdef",
      backgroundBox: box(),
    });

    // By ratified design the full-frame fill paints regardless of the glyphs;
    // only the box is suppressed.
    expect(ops.map((o) => o.op)).toEqual(["fillRect", "fillText"]);
    expect(ops[0].args).toEqual([0, 0, 400, 200]);
  });
});
