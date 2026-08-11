/**
 * @vitest-environment happy-dom
 *
 * Box painter choreography: shadow → rounded fill → clear shadow → stroke.
 * The shadow MUST be cleared before anything else paints, the radius is clamped
 * at render time, and a degenerate rect paints nothing at all.
 */

import { describe, expect, it, vi } from "vitest";
import {
  drawTextBackgroundBox,
  type TextBackgroundBoxStyle,
  textBoxOverflow,
} from "./formatted-text-box-render";

type Op = { op: string; args: number[]; shadow: [string, number, number, number] };

function makeCtx() {
  const ops: Op[] = [];
  const ctx = {
    fillStyle: "" as string | CanvasGradient,
    strokeStyle: "",
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    roundRect: vi.fn(function (this: void, ...args: number[]) {
      pending = args;
    }),
    fill: vi.fn(() => record("fill")),
    stroke: vi.fn(() => record("stroke")),
  } as unknown as CanvasRenderingContext2D & { fillStyle: string };

  let pending: number[] = [];
  function record(op: string) {
    ops.push({
      op,
      args: pending,
      shadow: [ctx.shadowColor, ctx.shadowBlur, ctx.shadowOffsetX, ctx.shadowOffsetY],
    });
  }

  return { ctx, ops };
}

const RECT = { x: 10, y: 20, width: 100, height: 40 };

function style(over: Partial<TextBackgroundBoxStyle> = {}): TextBackgroundBoxStyle {
  return {
    color: "#ff0000",
    cornerRadius: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    shadow: null,
    stroke: null,
    ...over,
  };
}

describe("drawTextBackgroundBox", () => {
  it("fills the rounded rect with the box colour", () => {
    const { ctx, ops } = makeCtx();

    drawTextBackgroundBox(ctx, RECT, style({ cornerRadius: 6 }));

    expect(ops.map((o) => o.op)).toEqual(["fill"]);
    expect(ops[0].args).toEqual([10, 20, 100, 40, 6]);
    expect(ctx.fillStyle).toBe("#ff0000");
  });

  it("clamps cornerRadius to min(w, h) / 2 at render time", () => {
    const { ctx, ops } = makeCtx();

    drawTextBackgroundBox(ctx, RECT, style({ cornerRadius: 999 }));

    // min(100, 40) / 2 = 20
    expect(ops[0].args[4]).toBe(20);
  });

  it("paints shadow → fill → stroke, with the shadow cleared before the stroke", () => {
    const { ctx, ops } = makeCtx();

    drawTextBackgroundBox(
      ctx,
      RECT,
      style({
        shadow: { color: "#000000", blur: 5, offsetX: 2, offsetY: 3 },
        stroke: { color: "#00ff00", width: 4 },
      }),
    );

    expect(ops.map((o) => o.op)).toEqual(["fill", "stroke"]);
    // The fill carries the shadow…
    expect(ops[0].shadow).toEqual(["#000000", 5, 2, 3]);
    // …and the stroke does not (it would double-cast the box shadow).
    expect(ops[1].shadow).toEqual(["transparent", 0, 0, 0]);
    expect(ctx.strokeStyle).toBe("#00ff00");
    expect(ctx.lineWidth).toBe(4);
  });

  it("leaves the context shadow cleared so later paints cannot inherit it", () => {
    const { ctx } = makeCtx();

    drawTextBackgroundBox(
      ctx,
      RECT,
      style({ shadow: { color: "#000000", blur: 9, offsetX: 1, offsetY: 1 } }),
    );

    expect(ctx.shadowColor).toBe("transparent");
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.shadowOffsetX).toBe(0);
    expect(ctx.shadowOffsetY).toBe(0);
  });

  it.each([
    ["zero width", { ...RECT, width: 0 }],
    ["zero height", { ...RECT, height: 0 }],
    ["negative width", { ...RECT, width: -5 }],
  ])("paints nothing for a degenerate rect (%s)", (_label, rect) => {
    const { ctx, ops } = makeCtx();

    drawTextBackgroundBox(
      ctx,
      rect,
      style({
        shadow: { color: "#000000", blur: 5, offsetX: 0, offsetY: 0 },
        stroke: { color: "#00ff00", width: 4 },
      }),
    );

    expect(ops).toHaveLength(0);
    // No shadow was ever set on the context either.
    expect(ctx.shadowColor).toBe("");
  });

  it("skips a zero-width or colourless stroke", () => {
    const { ctx, ops } = makeCtx();

    drawTextBackgroundBox(ctx, RECT, style({ stroke: { color: "#00ff00", width: 0 } }));

    expect(ops.map((o) => o.op)).toEqual(["fill"]);
  });
});

describe("textBoxOverflow", () => {
  it("is zero when there is no box", () => {
    expect(textBoxOverflow(null)).toBe(0);
    expect(textBoxOverflow(style())).toBe(0);
  });

  it("takes the larger of the two shadow axes", () => {
    expect(
      textBoxOverflow(style({ shadow: { color: "#000", blur: 5, offsetX: 2, offsetY: -8 } })),
    ).toBe(13);
  });

  it("accounts for the outer half of the centred stroke", () => {
    expect(textBoxOverflow(style({ stroke: { color: "#000", width: 30 } }))).toBe(15);
  });

  it("takes the max of shadow and stroke bleed", () => {
    expect(
      textBoxOverflow(
        style({
          shadow: { color: "#000", blur: 1, offsetX: 1, offsetY: 0 },
          stroke: { color: "#000", width: 30 },
        }),
      ),
    ).toBe(15);
  });
});
