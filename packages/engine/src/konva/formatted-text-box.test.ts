/**
 * @vitest-environment happy-dom
 *
 * Union-rect geometry for the text background box: ONE rect around all lines in
 * the block's local unrotated space, derived from the SAME offsets that place
 * the glyphs (`lineStartX` / `textStartY`), then expanded by the four paddings.
 */

import { describe, expect, it } from "vitest";
import { computeTextUnionRect, lineStartX, textStartY } from "./formatted-text-box";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

const NO_PAD = { top: 0, right: 0, bottom: 0, left: 0 };

function line(width: number, fontSize = 20, extra: Record<string, unknown> = {}): TextLine {
  const style = resolveStyle({ fontSize, fontFamily: "Arial", ...extra });
  return { parts: [{ text: "Hi", style, width }], width, height: fontSize * 1.2 };
}

const LAYOUT = {
  width: 400,
  height: 200,
  padding: 10,
  align: "left",
  verticalAlign: "top",
};

describe("computeTextUnionRect — horizontal alignment (fixed width)", () => {
  it.each([
    ["left", 10],
    ["center", 150],
    ["right", 290],
  ])("anchors a single line at x=%s → %i", (align, expectedX) => {
    const lines = [line(100)];
    const rect = computeTextUnionRect(lines, { ...LAYOUT, align }, NO_PAD);

    expect(rect.x).toBe(expectedX);
    expect(rect.width).toBe(100);
    // The box x must equal the glyph x — never independently derived.
    expect(rect.x).toBe(lineStartX(lines[0], { ...LAYOUT, align }));
  });
});

describe("computeTextUnionRect — vertical alignment (fixed height)", () => {
  it.each([
    ["top", 10],
    ["middle", 90],
    ["bottom", 170],
  ])("anchors a single line at y=%s → %i", (verticalAlign, expectedY) => {
    const lines = [line(100)];
    const layout = { ...LAYOUT, verticalAlign };
    const rect = computeTextUnionRect(lines, layout, NO_PAD);

    expect(rect.y).toBe(expectedY);
    // Height is the ink height (last line contributes its em box, not its
    // full line box), matching textContentHeight.
    expect(rect.height).toBe(20);
    expect(rect.y).toBe(textStartY(lines, layout));
  });
});

describe("computeTextUnionRect — multi-line ragged content", () => {
  const lines = [line(100), line(60)];

  it.each([
    ["left", 10],
    ["center", 150],
    ["right", 290],
  ])("unions ragged lines into one rect (%s)", (align, expectedX) => {
    const rect = computeTextUnionRect(lines, { ...LAYOUT, align }, NO_PAD);

    // One rect spanning the widest line — never a per-line box.
    expect(rect.x).toBe(expectedX);
    expect(rect.width).toBe(100);
    // 24 (first line's full line box) + 20 (last line's em box).
    expect(rect.height).toBe(44);
  });

  it("returns an empty rect for no lines", () => {
    expect(computeTextUnionRect([], LAYOUT, NO_PAD)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe("computeTextUnionRect — padding", () => {
  it("expands outward by each side independently", () => {
    const rect = computeTextUnionRect([line(100)], LAYOUT, {
      top: 4,
      right: 8,
      bottom: 16,
      left: 2,
    });

    expect(rect).toEqual({ x: 8, y: 6, width: 110, height: 40 });
  });

  it("honours negative padding, tightening the rect inward", () => {
    const rect = computeTextUnionRect([line(100)], LAYOUT, {
      top: -2,
      right: -10,
      bottom: -2,
      left: -10,
    });

    expect(rect).toEqual({ x: 20, y: 12, width: 80, height: 16 });
  });

  it("clamps a degenerate rect to non-negative extents", () => {
    const rect = computeTextUnionRect([line(100)], LAYOUT, {
      top: -50,
      right: -60,
      bottom: -50,
      left: -60,
    });

    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe("computeTextUnionRect — trailing slack", () => {
  it("includes italic overhang and trailing letter-spacing on the right edge", () => {
    const italic = line(100, 20, { fontStyle: "italic", letterSpacing: 3 });

    const rect = computeTextUnionRect([italic], LAYOUT, NO_PAD);

    // 100 + 3 (trailing letter-spacing) + 20 * 0.12 (italic overhang).
    expect(rect.width).toBeCloseTo(105.4, 5);
  });
});
