/**
 * @vitest-environment happy-dom
 *
 * Union-rect layout combinations the first pass left open: every
 * `align` × `verticalAlign` pairing at a FIXED frame that is wider/taller than
 * the content, ragged multi-line stacks, composition with the block's own
 * `text/padding` (which defaults to 4 on text blocks and must not be
 * double-counted), and the `lineTrailingSlack` allowance for italic /
 * letter-spaced ink.
 */

import { describe, expect, it } from "vitest";
import { computeTextUnionRect, lineStartX, textStartY } from "./formatted-text-box";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

const NO_PAD = { top: 0, right: 0, bottom: 0, left: 0 };
const ALIGNS = ["left", "center", "right"] as const;
const V_ALIGNS = ["top", "middle", "bottom"] as const;

function line(width: number, fontSize = 20, extra: Record<string, unknown> = {}): TextLine {
  const style = resolveStyle({ fontSize, fontFamily: "Arial", ...extra });
  return { parts: [{ text: "Hi", style, width }], width, height: fontSize * 1.2 };
}

/** Frame far larger than the content, so every anchor is distinguishable. */
const LAYOUT = {
  width: 400,
  height: 200,
  padding: 10,
  align: "left",
  verticalAlign: "top",
};

describe("computeTextUnionRect — every align × verticalAlign at a fixed frame", () => {
  const lines = [line(100), line(60)];

  it.each(
    ALIGNS.flatMap((align) => V_ALIGNS.map((verticalAlign) => [align, verticalAlign] as const)),
  )("anchors the box exactly where the glyphs go (%s / %s)", (align, verticalAlign) => {
    const layout = { ...LAYOUT, align, verticalAlign };
    const rect = computeTextUnionRect(lines, layout, NO_PAD);

    // The box origin is never derived independently — it IS the glyph origin.
    expect(rect.x).toBe(Math.min(...lines.map((l) => lineStartX(l, layout))));
    expect(rect.y).toBe(textStartY(lines, layout));
    // 24 (first full line box) + 20 (last line's em box).
    expect(rect.height).toBe(44);
    expect(rect.width).toBe(100);
    // The box stays inside the frame's content area on every axis.
    expect(rect.x).toBeGreaterThanOrEqual(layout.padding);
    expect(rect.y).toBeGreaterThanOrEqual(layout.padding);
    expect(rect.x + rect.width).toBeLessThanOrEqual(layout.width - layout.padding);
    expect(rect.y + rect.height).toBeLessThanOrEqual(layout.height - layout.padding);
  });

  it.each([
    ["top", 10],
    ["middle", 78],
    ["bottom", 146],
  ])("stacks a ragged pair from the %s edge → y=%i", (verticalAlign, expectedY) => {
    const rect = computeTextUnionRect(lines, { ...LAYOUT, verticalAlign }, NO_PAD);
    expect(rect.y).toBe(expectedY);
  });
});

describe("computeTextUnionRect — composes with the block's text/padding", () => {
  it.each(ALIGNS)("shifts with text/padding by exactly one padding delta (%s)", (align) => {
    const lines = [line(100)];
    const boxPad = { top: 10, right: 10, bottom: 10, left: 10 };

    const at0 = computeTextUnionRect(lines, { ...LAYOUT, align, padding: 0 }, boxPad);
    const at4 = computeTextUnionRect(lines, { ...LAYOUT, align, padding: 4 }, boxPad);

    // text/padding insets the CONTENT; the box hugs that content, so the box
    // moves by the same amount the glyphs do — never by twice.
    const glyphDelta =
      lineStartX(lines[0], { ...LAYOUT, align, padding: 4 }) -
      lineStartX(lines[0], { ...LAYOUT, align, padding: 0 });
    expect(at4.x - at0.x).toBe(glyphDelta);
    expect(at4.y - at0.y).toBe(4);
    // Size depends only on the content and the BOX padding.
    expect(at4.width).toBe(at0.width);
    expect(at4.height).toBe(at0.height);
  });

  it("measures box padding from the content edge, not the frame edge", () => {
    const lines = [line(100)];
    const rect = computeTextUnionRect(
      lines,
      { ...LAYOUT, padding: 4 },
      { top: 10, right: 10, bottom: 10, left: 10 },
    );

    // Content starts at 4 (text/padding); the box reaches 10px further out.
    expect(rect.x).toBe(-6);
    expect(rect.y).toBe(-6);
    expect(rect.width).toBe(120);
    expect(rect.height).toBe(40);
  });
});

describe("computeTextUnionRect — trailing ink slack", () => {
  it("widens the box by the italic overhang so the last glyph is not clipped", () => {
    const plain = computeTextUnionRect([line(100)], LAYOUT, NO_PAD);
    const italic = computeTextUnionRect([line(100, 20, { fontStyle: "italic" })], LAYOUT, NO_PAD);

    // ITALIC_OVERHANG_RATIO = 0.12 → 20 × 0.12 = 2.4
    expect(italic.width - plain.width).toBeCloseTo(2.4, 5);
    expect(italic.x).toBe(plain.x);
  });

  it("widens the box by the trailing letter-spacing", () => {
    const plain = computeTextUnionRect([line(100)], LAYOUT, NO_PAD);
    const spaced = computeTextUnionRect([line(100, 20, { letterSpacing: 6 })], LAYOUT, NO_PAD);

    expect(spaced.width - plain.width).toBeCloseTo(6, 5);
  });

  it("takes the slack from the widest RENDERED edge, not the widest advance", () => {
    // Line B has the smaller advance but the larger painted right edge.
    const a = line(100);
    const b = line(98, 20, { letterSpacing: 10 });
    const rect = computeTextUnionRect([a, b], { ...LAYOUT, align: "left" }, NO_PAD);

    expect(rect.width).toBeCloseTo(108, 5);
  });
});
