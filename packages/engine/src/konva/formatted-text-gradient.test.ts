/**
 * @vitest-environment happy-dom
 *
 * Flat gradient text fill + curved fallback. Canvas text metrics are stubbed
 * (10px/char) via a mocked getDummyContext, matching formatted-text-curve.test.
 * A separate spy context records createLinearGradient/createRadialGradient so we
 * can assert the flat path builds a real CanvasGradient while curved stays solid.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextGradient, TextRun } from "../block/block.types";

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

import { computeCurvedLayout } from "./formatted-text-curve";
import { computeTextLines } from "./formatted-text-layout";
import { renderCurvedText, renderFormattedText } from "./formatted-text-render";

interface SpyCtx {
  ctx: CanvasRenderingContext2D;
  linear: ReturnType<typeof vi.fn>;
  radial: ReturnType<typeof vi.fn>;
  fills: (string | CanvasGradient)[];
}

function makeSpyCtx(): SpyCtx {
  const noop = () => undefined;
  const grad = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  const linear = vi.fn(() => grad);
  const radial = vi.fn(() => grad);
  const fills: (string | CanvasGradient)[] = [];
  let fillStyle: string | CanvasGradient = "";

  const ctx = {
    save: noop,
    restore: noop,
    beginPath: noop,
    rect: noop,
    clip: noop,
    translate: noop,
    rotate: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fillRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: (t: string) => ({ width: t.length * 10 }),
    createLinearGradient: linear,
    createRadialGradient: radial,
    font: "",
    textAlign: "left",
    textBaseline: "top",
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string | CanvasGradient) {
      fillStyle = v;
      fills.push(v);
    },
  } as unknown as CanvasRenderingContext2D;

  return { ctx, linear, radial, fills };
}

const gradient = (type: "linear" | "radial"): TextGradient => ({
  type,
  angle: 45,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#0000ff" },
  ],
});

const runs = (grad?: TextGradient): TextRun[] => [
  { text: "Hi", style: { fontSize: 20, fill: "#000000", fillGradient: grad } },
];

const config = {
  width: 200,
  height: 60,
  padding: 0,
  align: "left",
  verticalAlign: "top",
};

describe("flat gradient text fill", () => {
  it("builds a linear CanvasGradient for a flat run and assigns it as fillStyle", () => {
    const spy = makeSpyCtx();
    const lines = computeTextLines(runs(gradient("linear")), {
      width: 200,
      padding: 0,
      wrap: "none",
      lineHeight: 1.2,
      plainText: "Hi",
    });

    renderFormattedText(spy.ctx, lines, config);

    expect(spy.linear).toHaveBeenCalledTimes(1);
    expect(spy.radial).not.toHaveBeenCalled();
    // The built gradient object was assigned as the fill (not a solid string).
    expect(spy.fills.some((f) => typeof f !== "string")).toBe(true);
  });

  it("builds a radial CanvasGradient for a radial run", () => {
    const spy = makeSpyCtx();
    const lines = computeTextLines(runs(gradient("radial")), {
      width: 200,
      padding: 0,
      wrap: "none",
      lineHeight: 1.2,
      plainText: "Hi",
    });

    renderFormattedText(spy.ctx, lines, config);

    expect(spy.radial).toHaveBeenCalledTimes(1);
    expect(spy.linear).not.toHaveBeenCalled();
  });

  it("uses the solid fill (no gradient) when the run has none", () => {
    const spy = makeSpyCtx();
    const lines = computeTextLines(runs(), {
      width: 200,
      padding: 0,
      wrap: "none",
      lineHeight: 1.2,
      plainText: "Hi",
    });

    renderFormattedText(spy.ctx, lines, config);

    expect(spy.linear).not.toHaveBeenCalled();
    expect(spy.radial).not.toHaveBeenCalled();
    expect(spy.fills).toContain("#000000");
  });

  it("builds a second gradient for the underline so it matches the glyph fill", () => {
    const spy = makeSpyCtx();
    const decorated: TextRun[] = [
      {
        text: "Hi",
        style: {
          fontSize: 20,
          fill: "#000000",
          fillGradient: gradient("linear"),
          textDecoration: "underline",
        },
      },
    ];
    const lines = computeTextLines(decorated, {
      width: 200,
      padding: 0,
      wrap: "none",
      lineHeight: 1.2,
      plainText: "Hi",
    });

    renderFormattedText(spy.ctx, lines, config);

    // One gradient for the glyph fill, one for the decoration stroke.
    expect(spy.linear).toHaveBeenCalledTimes(2);
  });

  it("splits runs with different gradients into separate parts (no merge)", () => {
    const mixed: TextRun[] = [
      { text: "AB", style: { fontSize: 20, fillGradient: gradient("linear") } },
      {
        text: "CD",
        style: {
          fontSize: 20,
          fillGradient: { type: "linear", angle: 90, stops: gradient("linear").stops },
        },
      },
    ];
    const lines = computeTextLines(mixed, {
      width: 999,
      padding: 0,
      wrap: "none",
      lineHeight: 1.2,
      plainText: "ABCD",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].parts).toHaveLength(2);
    expect(lines[0].parts[0].text).toBe("AB");
    expect(lines[0].parts[1].text).toBe("CD");
  });
});

describe("curved text gradient fallback", () => {
  it("never builds a gradient for curved glyphs (renders solid)", () => {
    const spy = makeSpyCtx();
    const layout = computeCurvedLayout(runs(gradient("linear")), {
      radius: 120,
      direction: "up",
      padding: 0,
    });

    renderCurvedText(spy.ctx, layout);

    expect(spy.linear).not.toHaveBeenCalled();
    expect(spy.radial).not.toHaveBeenCalled();
    // Falls back to the run's solid fill.
    expect(spy.fills).toContain("#000000");
  });

  it("falls back to the first stop's colour when no solid fill is set", () => {
    const spy = makeSpyCtx();
    const noFill: TextRun[] = [
      { text: "Hi", style: { fontSize: 20, fill: "", fillGradient: gradient("linear") } },
    ];
    const layout = computeCurvedLayout(noFill, { radius: 120, direction: "up", padding: 0 });

    renderCurvedText(spy.ctx, layout);

    expect(spy.linear).not.toHaveBeenCalled();
    expect(spy.fills).toContain("#ff0000");
  });
});
