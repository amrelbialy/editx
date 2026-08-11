import type Konva from "konva";
import { type TextBackgroundBoxStyle, textBoxOverflow } from "./formatted-text-box-render";
import { lineTrailingSlack, type TextLine } from "./formatted-text-utils";

export interface TextRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Inflated clip / self-rect origin for a bleed; `-0` would leak into exports. */
const boxOrigin = (bleed: number): number => (bleed > 0 ? -bleed : 0);

/**
 * Reads the background box style off a node's attrs bag.
 *
 * `getAttrs()` (not `getAttr()`) because bounds are queried by Konva during
 * caching / hit-graph work on nodes whose attrs bag may be absent.
 */
export function readBackgroundBox(node: Konva.Node): TextBackgroundBoxStyle | null {
  const attrs = node.getAttrs() as { backgroundBox?: TextBackgroundBoxStyle | null };
  return attrs.backgroundBox ?? null;
}

/**
 * How far the box reaches outside the container rect `[0, 0, w, h]`.
 *
 * Two independent sources: the box's own PADDING pushes the union rect outward
 * (`computeTextUnionRect` starts at `left - padding.left`, which is outside the
 * container as soon as a side's padding exceeds `text/padding`), and its shadow
 * plus the outer half of its centred stroke paint beyond that rect again.
 * Negative padding only tightens the rect inward, so it contributes nothing.
 */
function textBoxBleed(box: TextBackgroundBoxStyle | null): number {
  if (!box) return 0;
  const p = box.padding;
  return Math.max(0, p.top, p.right, p.bottom, p.left) + textBoxOverflow(box);
}

/**
 * The container rect grown by {@link textBoxBleed}. The scene clip and the
 * node's self rect BOTH derive from this one function, so they cannot drift
 * apart and neither can crop the painted box.
 */
export function textBoxBleedRect(
  box: TextBackgroundBoxStyle | null,
  width: number,
  height: number,
): TextRect {
  const bleed = textBoxBleed(box);
  return {
    x: boxOrigin(bleed),
    y: boxOrigin(bleed),
    width: width + bleed * 2,
    height: height + bleed * 2,
  };
}

/**
 * Full line-box height (the last line keeps its line-gap) so the editing caret,
 * which spans fontSize×lineHeight, is always contained by the box.
 */
export function computedTextHeight(lines: TextLine[], padding: number): number {
  const contentHeight = lines.reduce((sum, line) => sum + line.height, 0);
  return contentHeight + padding * 2;
}

/**
 * Widest line including the last glyph's trailing letter-spacing / italic
 * overhang, so a hugged width is >= the true rendered right edge and never
 * marginally wraps.
 */
export function computedTextWidth(lines: TextLine[], padding: number): number {
  const maxLineWidth = lines.reduce((max, l) => Math.max(max, l.width + lineTrailingSlack(l)), 0);
  return maxLineWidth + padding * 2;
}
