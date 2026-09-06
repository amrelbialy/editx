/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import type { TextBoxLayout } from "./formatted-text-box";
import { caretRectForOffset, selectionRectsForRange } from "./formatted-text-caret";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

/** Single-part line with an explicit width/start so caret math is deterministic
 *  at part boundaries (no reliance on canvas glyph metrics). */
function line(
  text: string,
  start: number,
  width: number,
  fontSize = 20,
  lineHeight = 1.2,
): TextLine {
  const style = resolveStyle({ fontSize, fontFamily: "Arial" });
  return {
    parts: [{ text, style, width }],
    width,
    height: fontSize * lineHeight,
    start,
  };
}

const LAYOUT: TextBoxLayout = {
  width: 200,
  height: 100,
  padding: 0,
  align: "left",
  verticalAlign: "top",
};

// "Hi\nYo" → H0 i1 \n2 Y3 o4, lengths 2 + 2.
const LINES = [line("Hi", 0, 30), line("Yo", 3, 26)];

describe("caretRectForOffset", () => {
  it("returns null for no lines", () => {
    expect(caretRectForOffset([], LAYOUT, 0)).toBeNull();
  });

  it("places the caret at the line start for offset 0", () => {
    expect(caretRectForOffset(LINES, LAYOUT, 0)).toEqual({ x: 0, y: 0, height: 20 });
  });

  it("places the caret at the line end (before the newline)", () => {
    expect(caretRectForOffset(LINES, LAYOUT, 2)).toEqual({ x: 30, y: 0, height: 20 });
  });

  it("moves to the next line's start after the newline", () => {
    expect(caretRectForOffset(LINES, LAYOUT, 3)).toEqual({ x: 0, y: 24, height: 20 });
  });

  it("places the caret at the end of the last line", () => {
    expect(caretRectForOffset(LINES, LAYOUT, 5)).toEqual({ x: 26, y: 24, height: 20 });
  });

  it("uses the em box (max font size), not fontSize×lineHeight, for height", () => {
    const tall = [line("Hi", 0, 30, 20, 3)];
    expect(caretRectForOffset(tall, LAYOUT, 0)?.height).toBe(20);
  });

  it("honors vertical-align bottom via textStartY", () => {
    const layout = { ...LAYOUT, verticalAlign: "bottom" };
    // content height = 24 (interior) + 20 (last em) = 44; bottom start = 100-44 = 56.
    expect(caretRectForOffset(LINES, layout, 0)?.y).toBe(56);
  });
});

describe("selectionRectsForRange", () => {
  it("returns nothing for an empty/inverted range", () => {
    expect(selectionRectsForRange(LINES, LAYOUT, 3, 3)).toEqual([]);
    expect(selectionRectsForRange(LINES, LAYOUT, 4, 2)).toEqual([]);
  });

  it("covers a single line within its em box", () => {
    expect(selectionRectsForRange(LINES, LAYOUT, 0, 2)).toEqual([
      { x: 0, y: 0, width: 30, height: 20 },
    ]);
  });

  it("emits one rect per covered line across a newline", () => {
    expect(selectionRectsForRange(LINES, LAYOUT, 0, 5)).toEqual([
      { x: 0, y: 0, width: 30, height: 20 },
      { x: 0, y: 24, width: 26, height: 20 },
    ]);
  });
});
