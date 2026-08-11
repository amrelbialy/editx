/**
 * Auto-height tightening: the computed text height must hug the glyphs by
 * trimming the trailing line-gap on the LAST line, while preserving interior
 * line spacing for multi-line text. `textContentHeight` is the shared helper
 * used by both FormattedText.getComputedHeight() and the vertical-align math in
 * renderFormattedText, so hit-testing/selection and rendering stay aligned.
 */

import { describe, expect, it } from "vitest";
import {
  lineMaxFontSize,
  resolveStyle,
  type TextLine,
  textContentHeight,
} from "./formatted-text-utils";

/** Build a single-part line box the way the layout does (height = fs·lineHeight). */
function line(fontSize: number, lineHeight = 1.2, width = 30): TextLine {
  const style = resolveStyle({ fontSize, fontFamily: "Arial" });
  return {
    parts: [{ text: "Hi", style, width }],
    width,
    height: fontSize * lineHeight,
  };
}

/** A line whose parts carry mixed font sizes (max drives the em box). */
function mixedLine(sizes: number[], lineHeight = 1.2): TextLine {
  const parts = sizes.map((fs) => ({
    text: "x",
    style: resolveStyle({ fontSize: fs, fontFamily: "Arial" }),
    width: 10,
  }));
  return {
    parts,
    width: parts.length * 10,
    height: Math.max(...sizes) * lineHeight,
  };
}

describe("textContentHeight", () => {
  it("hugs a single line to its em box (trims the trailing line-gap)", () => {
    const lines = [line(20)];
    // Full line box is fontSize × lineHeight = 24, but the box hugs the em box.
    expect(lines[0].height).toBeCloseTo(24, 5);
    expect(textContentHeight(lines)).toBeCloseTo(20, 5);
  });

  it("preserves interior spacing but trims only the last line for multi-line", () => {
    const lines = [line(20), line(20)];
    // Interior line keeps the full 24 gap; last line contributes only its em box.
    expect(textContentHeight(lines)).toBeCloseTo(24 + 20, 5);
  });

  it("uses the largest font size on the last line", () => {
    const lines = [mixedLine([12, 40])];
    expect(lineMaxFontSize(lines[0])).toBe(40);
    expect(textContentHeight(lines)).toBeCloseTo(40, 5);
  });

  it("returns 0 for no lines", () => {
    expect(textContentHeight([])).toBe(0);
  });
});
