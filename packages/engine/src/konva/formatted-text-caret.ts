import { lineStartX, type TextBoxLayout, textStartY } from "./formatted-text-box";
import {
  applyTextTransform,
  formatFont,
  getDummyContext,
  lineMaxFontSize,
  type ResolvedTextRunStyle,
  type TextLine,
} from "./formatted-text-utils";

export interface TextCaretRect {
  x: number;
  y: number;
  height: number;
}

export interface TextSelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Advance width of `text`, counting letter-spacing after every glyph. */
function measureAdvance(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: ResolvedTextRunStyle,
): number {
  if (text.length === 0) return 0;
  ctx.font = formatFont(style);
  const display = applyTextTransform(text, style.textTransform);
  if (style.letterSpacing !== 0 && display.length > 0) {
    let w = 0;
    for (let i = 0; i < display.length; i++) {
      w += ctx.measureText(display[i]).width + style.letterSpacing;
    }
    return w;
  }
  return ctx.measureText(display).width;
}

/** Source characters a line covers (sum of its parts' text lengths). */
function lineLength(line: TextLine): number {
  let n = 0;
  for (const p of line.parts) n += p.text.length;
  return n;
}

/** X of the caret `k` chars into a line, in the block's local space. */
function caretX(
  ctx: CanvasRenderingContext2D,
  line: TextLine,
  layout: TextBoxLayout,
  k: number,
): number {
  let x = lineStartX(line, layout);
  let remaining = k;
  for (const part of line.parts) {
    const len = part.text.length;
    if (remaining >= len) {
      x += part.width;
      remaining -= len;
    } else {
      x += measureAdvance(ctx, part.text.slice(0, remaining), part.style);
      return x;
    }
  }
  return x;
}

/** Top Y of each line, on the trailing-leading model (matches the renderer). */
function lineTops(lines: TextLine[], layout: TextBoxLayout): number[] {
  const tops: number[] = [];
  let y = textStartY(lines, layout);
  for (const line of lines) {
    tops.push(y);
    y += line.height;
  }
  return tops;
}

/** Line index + local char index for a global offset. */
function locate(lines: TextLine[], offset: number): { i: number; k: number } {
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].start ?? 0;
    if (offset <= start + lineLength(lines[i])) return { i, k: Math.max(0, offset - start) };
  }
  const last = Math.max(0, lines.length - 1);
  return { i: last, k: lines.length ? lineLength(lines[last]) : 0 };
}

/** Caret rectangle (em-box height) for a collapsed offset, or null when empty. */
export function caretRectForOffset(
  lines: TextLine[],
  layout: TextBoxLayout,
  offset: number,
): TextCaretRect | null {
  if (lines.length === 0) return null;
  const ctx = getDummyContext();
  const { i, k } = locate(lines, offset);
  const line = lines[i];
  return {
    x: caretX(ctx, line, layout, k),
    y: lineTops(lines, layout)[i],
    height: lineMaxFontSize(line),
  };
}

/** Per-line selection rectangles (em-box height) for a [from, to) range. */
export function selectionRectsForRange(
  lines: TextLine[],
  layout: TextBoxLayout,
  from: number,
  to: number,
): TextSelectionRect[] {
  if (lines.length === 0 || to <= from) return [];
  const ctx = getDummyContext();
  const tops = lineTops(lines, layout);
  const rects: TextSelectionRect[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = line.start ?? 0;
    const len = lineLength(line);
    const lo = Math.max(from, start);
    const hi = Math.min(to, start + len);
    if (hi <= lo) continue;
    const x1 = caretX(ctx, line, layout, lo - start);
    const x2 = caretX(ctx, line, layout, hi - start);
    if (x2 <= x1) continue;
    rects.push({ x: x1, y: tops[i], width: x2 - x1, height: lineMaxFontSize(line) });
  }
  return rects;
}
