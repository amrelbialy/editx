/**
 * Fill a rounded rectangle on a 2D canvas context.
 *
 * Prefers the native `ctx.roundRect` (Canvas API) when available, falling back
 * to a manual arcTo path for environments (older canvas / happy-dom) that lack
 * it. The radius is clamped to half the smaller side so it never self-overlaps.
 */
export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  if (w <= 0 || h <= 0) return;
  traceRoundRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

/** Stroke a rounded rectangle. The stroke is centred on the path. */
export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  if (w <= 0 || h <= 0) return;
  traceRoundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

function traceRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    roundRectPath(ctx, x, y, w, h, r);
  }
}

/** Trace a rounded-rect path via arcTo (no fill/stroke — caller decides). */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
