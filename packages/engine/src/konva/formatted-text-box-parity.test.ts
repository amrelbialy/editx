/**
 * @vitest-environment happy-dom
 *
 * Non-regression parity for everything the background box sits UNDER:
 *  - run highlight pills must be bit-identical with the box on or off, and
 *    invariant to the box's padding / radius / colour,
 *  - glyph painting (shadow → stroke → fill → decoration) is unchanged, and
 *  - the legacy full-frame `fill/enabled` background is still a square
 *    `fillRect(0, 0, w, h)` painted before the box.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";
import { renderFormattedText, type TextRenderConfig } from "./formatted-text-render";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

interface Op {
  op: string;
  args: number[];
  /** `fillStyle` for fill ops, `strokeStyle` for stroke ops. */
  style: string;
}

/** Colours used ONLY by the box, so its ops can be filtered out by style. */
const BOX_FILL = "#0000ff";
const BOX_STROKE = "#00ff00";

function makeCtx() {
  const ops: Op[] = [];
  let pending: number[] = [];
  const noop = vi.fn();

  const ctx = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "" as CanvasLineJoin,
    textBaseline: "" as CanvasTextBaseline,
    textAlign: "" as CanvasTextAlign,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    measureText: vi.fn(() => ({ width: 10 })),
    roundRect: vi.fn((...args: number[]) => {
      pending = args;
    }),
    fill: vi.fn(() => record("fill", pending)),
    stroke: vi.fn(() => record("stroke", pending)),
    fillRect: vi.fn((...args: number[]) => record("fillRect", args)),
    fillText: vi.fn(() => record("fillText", [])),
    strokeText: vi.fn(() => record("strokeText", [])),
  } as unknown as CanvasRenderingContext2D;

  function record(op: string, args: number[]) {
    const stroking = op === "stroke" || op === "strokeText";
    ops.push({ op, args, style: (stroking ? ctx.strokeStyle : ctx.fillStyle) as string });
    // A path is consumed by the paint that follows it; keeping it would let a
    // later bare stroke() (the decoration) inherit the box's roundRect args.
    pending = [];
  }

  return { ctx, ops };
}

function line(over: Record<string, unknown> = {}, width = 100): TextLine {
  const style = resolveStyle({ fontSize: 20, fontFamily: "Arial", ...over });
  return { parts: [{ text: "Hi", style, width }], width, height: 24 };
}

const CONFIG: TextRenderConfig = {
  width: 400,
  height: 200,
  padding: 4,
  align: "left",
  verticalAlign: "top",
};

function box(over: Partial<TextBackgroundBoxStyle> = {}): TextBackgroundBoxStyle {
  return {
    color: BOX_FILL,
    cornerRadius: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    shadow: null,
    stroke: null,
    ...over,
  };
}

/** Ops with the box's own paint removed, so the two runs are comparable. */
function withoutBox(ops: Op[]): Op[] {
  return ops.filter(
    (o) =>
      !(o.op === "fill" && o.style === BOX_FILL) && !(o.op === "stroke" && o.style === BOX_STROKE),
  );
}

const HIGHLIGHTED = [
  line({ backgroundColor: "#ffff00" }),
  line({ backgroundColor: "#ffff00", textDecoration: "underline" }, 60),
];

describe("run highlight pills — invariant to the background box", () => {
  it("is bit-identical with the box off and the box on", () => {
    const off = makeCtx();
    const on = makeCtx();

    renderFormattedText(off.ctx, HIGHLIGHTED, { ...CONFIG, backgroundBox: null });
    renderFormattedText(on.ctx, HIGHLIGHTED, { ...CONFIG, backgroundBox: box() });

    expect(withoutBox(on.ops)).toEqual(off.ops);
  });

  it.each([
    ["padding", box({ padding: { top: 30, right: 30, bottom: 30, left: 30 } })],
    ["corner radius", box({ cornerRadius: 40 })],
    ["stroke", box({ stroke: { color: BOX_STROKE, width: 12 } })],
    ["shadow", box({ shadow: { color: "#000000", blur: 20, offsetX: 9, offsetY: 9 } })],
  ])("does not move when the box changes its %s", (_label, style) => {
    const off = makeCtx();
    const on = makeCtx();

    renderFormattedText(off.ctx, HIGHLIGHTED, { ...CONFIG, backgroundBox: null });
    renderFormattedText(on.ctx, HIGHLIGHTED, { ...CONFIG, backgroundBox: style });

    expect(withoutBox(on.ops)).toEqual(off.ops);
  });

  it("keeps the zero-default Highlight geometry", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line({ backgroundColor: "#ffff00" })], {
      ...CONFIG,
      backgroundBox: box({ padding: { top: 9, right: 9, bottom: 9, left: 9 } }),
    });

    const pill = ops.find((o) => o.style === "#ffff00");
    expect(pill?.args).toEqual([4, 4, 100, 20, 0]);
  });
});

describe("glyph painting — unchanged under the box", () => {
  it("keeps shadow → stroke → fill → decoration for every run", () => {
    const styled = [
      line({ textStrokeColor: "#000000", textStrokeWidth: 2, textDecoration: "underline" }),
    ];
    const off = makeCtx();
    const on = makeCtx();

    renderFormattedText(off.ctx, styled, { ...CONFIG, backgroundBox: null });
    renderFormattedText(on.ctx, styled, { ...CONFIG, backgroundBox: box() });

    expect(off.ops.map((o) => o.op)).toEqual(["strokeText", "fillText", "stroke"]);
    expect(withoutBox(on.ops)).toEqual(off.ops);
  });
});

describe("legacy fill/enabled background — untouched by the box", () => {
  it("still paints a square full-frame fillRect", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], { ...CONFIG, backgroundFill: "#123456" });

    expect(ops[0].op).toBe("fillRect");
    expect(ops[0].args).toEqual([0, 0, 400, 200]);
    expect(ops[0].style).toBe("#123456");
  });

  it("paints the legacy frame BEFORE the box, and neither replaces the other", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [line()], {
      ...CONFIG,
      backgroundFill: "#123456",
      backgroundBox: box({ cornerRadius: 5 }),
    });

    expect(ops.map((o) => o.op)).toEqual(["fillRect", "fill", "fillText"]);
    expect(ops[0].args).toEqual([0, 0, 400, 200]);
    // The box hugs the content and is NOT full-frame.
    expect(ops[1].args).toEqual([4, 4, 100, 20, 5]);
  });

  it("paints neither background when there is no text", () => {
    const { ctx, ops } = makeCtx();

    renderFormattedText(ctx, [], { ...CONFIG, backgroundFill: "#123456", backgroundBox: box() });

    expect(ops).toHaveLength(0);
  });
});
