import type { TextLine } from "./formatted-text-utils";
import { lineTrailingSlack, textContentHeight } from "./formatted-text-utils";

/** The subset of the render config that drives glyph placement. */
export interface TextBoxLayout {
  width: number;
  height: number;
  padding: number;
  align: string;
  verticalAlign: string;
}

export interface BoxPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Y of the first line's em-box top. Single source of truth for the vertical
 * start of both the glyphs and the background box, so the two can never drift.
 */
export function textStartY(lines: TextLine[], layout: TextBoxLayout): number {
  const pad = layout.padding;
  const totalHeight = layout.height - pad * 2;
  if (totalHeight <= 0) return pad;

  const textHeight = textContentHeight(lines);
  if (layout.verticalAlign === "middle") return pad + (totalHeight - textHeight) / 2;
  if (layout.verticalAlign === "bottom") return pad + totalHeight - textHeight;
  return pad;
}

/** X of a line's first glyph, per the horizontal alignment. */
export function lineStartX(line: TextLine, layout: TextBoxLayout): number {
  const pad = layout.padding;
  const totalWidth = layout.width - pad * 2;
  if (layout.align === "center") return pad + (totalWidth - line.width) / 2;
  if (layout.align === "right") return pad + totalWidth - line.width;
  return pad;
}

/**
 * Whether any glyph will actually be painted.
 *
 * `computeTextLines` emits one zero-width line for an empty paragraph (a run
 * whose text is `""`, or a blank line between two `\n`), so `lines.length === 0`
 * is NOT the same question as "is this block empty". The box hangs off this,
 * not off the line count, so a block the user has emptied while editing paints
 * no padding-only pill.
 */
export function hasVisibleGlyphs(lines: TextLine[]): boolean {
  return lines.some((line) => line.parts.some((part) => part.text.length > 0));
}

/**
 * ONE axis-aligned rect around ALL lines in the block's local unrotated space,
 * expanded outward by the four paddings.
 *
 * Ragged lines are unioned (not boxed per line), and each line's right edge
 * includes {@link lineTrailingSlack} so the box is never marginally narrower
 * than italic / letter-spaced ink. Negative padding is honoured as given and
 * tightens the rect inward; the result is clamped to non-negative extents so a
 * degenerate box can be detected by `width <= 0 || height <= 0`.
 */
export function computeTextUnionRect(
  lines: TextLine[],
  layout: TextBoxLayout,
  padding: BoxPadding,
): BoxRect {
  if (lines.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (const line of lines) {
    const x = lineStartX(line, layout);
    if (x < left) left = x;
    const edge = x + line.width + lineTrailingSlack(line);
    if (edge > right) right = edge;
  }

  const top = textStartY(lines, layout);
  const contentHeight = textContentHeight(lines);

  return {
    x: left - padding.left,
    y: top - padding.top,
    width: Math.max(0, right - left + padding.left + padding.right),
    height: Math.max(0, contentHeight + padding.top + padding.bottom),
  };
}
