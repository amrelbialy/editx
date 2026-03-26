import type { TextRunStyle } from "../block/block.types";

/** Default style values used when a run's style property is undefined. */
export const DEFAULT_STYLE: Required<TextRunStyle> = {
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
};

export interface TextLine {
  parts: LinePart[];
  width: number;
  height: number;
}

export interface LinePart {
  text: string;
  style: Required<TextRunStyle>;
  width: number;
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

export function formatFont(style: Required<TextRunStyle>): string {
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

export function resolveStyle(style: TextRunStyle): Required<TextRunStyle> {
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
  };
}
