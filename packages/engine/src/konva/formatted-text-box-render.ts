import type { TextBackgroundGeometry } from "../block/block.types";
import { fillRoundRect, strokeRoundRect } from "./canvas-round-rect";
import type { BoxPadding, BoxRect } from "./formatted-text-box";

export interface TextBoxShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface TextBoxStroke {
  color: string;
  width: number;
}

/** Resolved paint style for the text background box (one per text block). */
export interface TextBackgroundBoxStyle {
  color: string;
  geometry: TextBackgroundGeometry;
  cornerRadius: number;
  padding: BoxPadding;
  shadow: TextBoxShadow | null;
  stroke: TextBoxStroke | null;
}

/**
 * Outward paint bleed of the box beyond its rect: the shadow reach and the
 * outer half of the centred stroke. Callers inflate the scene clip and the
 * node's self-rect by this so cached/exported output matches the canvas.
 */
export function textBoxOverflow(style: TextBackgroundBoxStyle | null | undefined): number {
  if (!style) return 0;
  let overflow = 0;
  if (style.shadow) {
    const { blur, offsetX, offsetY } = style.shadow;
    overflow = Math.max(overflow, blur + Math.abs(offsetX), blur + Math.abs(offsetY));
  }
  if (style.stroke) overflow = Math.max(overflow, style.stroke.width / 2);
  return Math.max(0, overflow);
}

/**
 * Paint the background box: shadow → rounded fill → clear shadow → stroke.
 *
 * The shadow is applied on the 2D context (the Konva node-level shadow stays
 * off for text) and MUST be cleared before anything else paints, or the
 * per-run highlight pills and glyphs would inherit it — the same isolation
 * `drawPartText` does for per-run glyph shadows.
 *
 * A degenerate rect paints nothing at all: no shadow, no fill, no stroke.
 * `cornerRadius` is clamped here to `min(w, h) / 2`.
 */
export function drawTextBackgroundBox(
  ctx: CanvasRenderingContext2D,
  rect: BoxRect,
  style: TextBackgroundBoxStyle,
): void {
  if (rect.width <= 0 || rect.height <= 0) return;

  const radius = Math.max(0, Math.min(style.cornerRadius, rect.width / 2, rect.height / 2));

  if (style.shadow) {
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur;
    ctx.shadowOffsetX = style.shadow.offsetX;
    ctx.shadowOffsetY = style.shadow.offsetY;
  }

  ctx.fillStyle = style.color;
  fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);

  if (style.shadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (style.stroke && style.stroke.width > 0 && style.stroke.color) {
    // Konva graphic-stroke semantics: centred on the path, so half the width
    // bleeds outside the union rect. Paint-time only — never affects bounds.
    ctx.strokeStyle = style.stroke.color;
    ctx.lineWidth = style.stroke.width;
    strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  }
}
