import type { TextRunStyle } from "../block/block.types";

/**
 * Resolved style: every field defaulted EXCEPT `fillGradient`, which stays
 * optional (undefined = solid `fill`). Using `Required<TextRunStyle>` directly
 * would force a non-undefined gradient object into DEFAULT_STYLE.
 */
export type ResolvedTextRunStyle = Required<Omit<TextRunStyle, "fillGradient">> &
  Pick<TextRunStyle, "fillGradient">;

/** Default style values used when a run's style property is undefined. */
export const DEFAULT_STYLE: ResolvedTextRunStyle = {
  fontSize: 16,
  fontFamily: "Arial",
  fontWeight: "normal",
  fontStyle: "normal",
  fill: "#000000",
  letterSpacing: 0,
  textDecoration: "",
  backgroundColor: "",
  textTransform: "none",
  textShadowColor: "",
  textShadowBlur: 0,
  textShadowOffsetX: 0,
  textShadowOffsetY: 0,
  textStrokeColor: "",
  textStrokeWidth: 0,
  fillGradient: undefined,
};

export interface TextLine {
  parts: LinePart[];
  width: number;
  height: number;
}

export interface LinePart {
  text: string;
  style: ResolvedTextRunStyle;
  width: number;
}

/** Largest font size across a line's parts (the line's em-box height). */
export function lineMaxFontSize(line: TextLine): number {
  let max = 0;
  for (const p of line.parts) {
    if (p.style.fontSize > max) max = p.style.fontSize;
  }
  return max;
}

/** Fraction of font size added as right-side slack for italic/oblique glyphs. */
const ITALIC_OVERHANG_RATIO = 0.12;

/**
 * Horizontal width the glyphs can paint into BEYOND a line's pen-advance
 * `width`. A line's `width` is a sum of canvas `measureText().width` advances,
 * which (a) omit the trailing letter-spacing the DOM overlay applies after the
 * last glyph and (b) omit the italic/oblique right-side overhang (advance is the
 * pen position, not the visual right edge). Auto-width adds this slack so the
 * hugged box is never marginally narrower than the content it was sized to — the
 * bug where an italic, letter-spaced preset wrapped to a phantom second line.
 */
export function lineTrailingSlack(line: TextLine): number {
  const last = line.parts[line.parts.length - 1];
  if (!last || last.text.length === 0) return 0;
  const s = last.style;
  let slack = 0;
  if (s.letterSpacing > 0) slack += s.letterSpacing;
  if (s.fontStyle.includes("italic") || s.fontStyle.includes("oblique")) {
    slack += s.fontSize * ITALIC_OVERHANG_RATIO;
  }
  return slack;
}

/**
 * Height the text ink actually occupies (excludes the trailing line-gap).
 *
 * Interior lines keep their full `line.height` so multi-line spacing is
 * preserved, but the LAST line contributes only its em box (max font size)
 * instead of `fontSize × lineHeight`. That trims the empty strip the line-gap
 * would otherwise leave beneath a single line, so the auto-height box, the
 * highlight pills and vertical alignment all hug the glyphs.
 */
export function textContentHeight(lines: TextLine[]): number {
  if (lines.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < lines.length - 1; i++) sum += lines[i].height;
  sum += lineMaxFontSize(lines[lines.length - 1]);
  return sum;
}

let _dummyCtx: CanvasRenderingContext2D | null = null;
export function getDummyContext(): CanvasRenderingContext2D {
  if (!_dummyCtx) {
    const c = document.createElement("canvas");
    _dummyCtx = c.getContext("2d")!;
  }
  return _dummyCtx;
}

export function normalizeFontFamily(fontFamily: string): string {
  return fontFamily
    .split(",")
    .map((f) => {
      f = f.trim();
      if (f.includes(" ") && !f.includes('"') && !f.includes("'")) {
        f = `"${f}"`;
      }
      return f;
    })
    .join(", ");
}

export function formatFont(style: ResolvedTextRunStyle): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${normalizeFontFamily(style.fontFamily)}`;
}

/** Apply text-transform to a string. Original text is preserved in the data model. */
export function applyTextTransform(text: string, transform: string): string {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

export function resolveStyle(style: TextRunStyle): ResolvedTextRunStyle {
  return {
    fontSize: style.fontSize ?? DEFAULT_STYLE.fontSize,
    fontFamily: style.fontFamily ?? DEFAULT_STYLE.fontFamily,
    fontWeight: style.fontWeight ?? DEFAULT_STYLE.fontWeight,
    fontStyle: style.fontStyle ?? DEFAULT_STYLE.fontStyle,
    fill: style.fill ?? DEFAULT_STYLE.fill,
    letterSpacing: style.letterSpacing ?? DEFAULT_STYLE.letterSpacing,
    textDecoration: style.textDecoration ?? DEFAULT_STYLE.textDecoration,
    backgroundColor: style.backgroundColor ?? DEFAULT_STYLE.backgroundColor,
    textTransform: style.textTransform ?? DEFAULT_STYLE.textTransform,
    textShadowColor: style.textShadowColor ?? DEFAULT_STYLE.textShadowColor,
    textShadowBlur: style.textShadowBlur ?? DEFAULT_STYLE.textShadowBlur,
    textShadowOffsetX: style.textShadowOffsetX ?? DEFAULT_STYLE.textShadowOffsetX,
    textShadowOffsetY: style.textShadowOffsetY ?? DEFAULT_STYLE.textShadowOffsetY,
    textStrokeColor: style.textStrokeColor ?? DEFAULT_STYLE.textStrokeColor,
    textStrokeWidth: style.textStrokeWidth ?? DEFAULT_STYLE.textStrokeWidth,
    // Carried through untouched — undefined means "solid fill".
    fillGradient: style.fillGradient,
  };
}
