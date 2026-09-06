import type Konva from "konva";
import { type BoxPadding, lineStartX, type TextBoxLayout, textStartY } from "./formatted-text-box";
import { type TextBackgroundBoxStyle, textBoxOverflow } from "./formatted-text-box-render";
import { lineTrailingSlack, type TextLine, textContentHeight } from "./formatted-text-utils";

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
  const paddingBleed = box.geometry === "frame" ? 0 : Math.max(0, p.top, p.right, p.bottom, p.left);
  return paddingBleed + textBoxOverflow(box);
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
 * Local paint bounds for flat text. Highlight rectangles use the same laid-out
 * line/run offsets as the renderer, then union with the block background bleed.
 */
export function formattedTextPaintRect(
  box: TextBackgroundBoxStyle | null,
  lines: TextLine[],
  layout: TextBoxLayout,
): TextRect {
  const bounds = textBoxBleedRect(box, layout.width, layout.height);
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;
  let yOffset = textStartY(lines, layout);

  for (const line of lines) {
    let xOffset = lineStartX(line, layout);
    let maxFontSize = 0;
    for (const part of line.parts) maxFontSize = Math.max(maxFontSize, part.style.fontSize);
    for (const part of line.parts) {
      if (part.style.backgroundColor && part.text.length > 0) {
        const padding = part.style.backgroundPadding;
        const partTop = yOffset + (maxFontSize - part.style.fontSize) * 0.8;
        const boxLeft = xOffset - (padding?.left ?? 0);
        const boxTop = partTop - (padding?.top ?? 0);
        const boxRight = xOffset + part.width + (padding?.right ?? 0);
        const boxBottom = partTop + part.style.fontSize + (padding?.bottom ?? 0);
        if (boxRight > boxLeft && boxBottom > boxTop) {
          left = Math.min(left, boxLeft);
          top = Math.min(top, boxTop);
          right = Math.max(right, boxRight);
          bottom = Math.max(bottom, boxBottom);
        }
      }
      xOffset += part.width;
    }
    yOffset += line.height;
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Box height on the trailing-leading model: interior lines keep their line-gap,
 * the last line hugs its em box. Shared with vertical-align math via
 * {@link textContentHeight} so a single line's box never grows with lineHeight.
 */
export function computedTextHeight(lines: TextLine[], padding: number | BoxPadding): number {
  const verticalPadding = typeof padding === "number" ? padding * 2 : padding.top + padding.bottom;
  return textContentHeight(lines) + verticalPadding;
}

/**
 * Widest line including the last glyph's trailing letter-spacing / italic
 * overhang, so a hugged width is >= the true rendered right edge and never
 * marginally wraps.
 */
export function computedTextWidth(lines: TextLine[], padding: number | BoxPadding): number {
  const maxLineWidth = lines.reduce((max, l) => Math.max(max, l.width + lineTrailingSlack(l)), 0);
  const horizontalPadding =
    typeof padding === "number" ? padding * 2 : padding.left + padding.right;
  return maxLineWidth + horizontalPadding;
}
