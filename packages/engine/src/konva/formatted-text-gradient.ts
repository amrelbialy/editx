import type { TextGradient } from "../block/block.types";

/** Local bounding box (node-local px) a run's gradient is mapped across. */
export interface GradientBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build a CanvasGradient spanning a run's local bounding box for a flat text
 * fill. Linear gradients run along `angle` degrees (0 = left→right) across the
 * box; radial gradients emanate from the box center out to half the diagonal.
 * Stops are mapped straight onto `addColorStop` with offsets clamped to 0..1.
 */
export function buildTextGradient(
  ctx: CanvasRenderingContext2D,
  gradient: TextGradient,
  box: GradientBox,
): CanvasGradient {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const halfW = box.width / 2;
  const halfH = box.height / 2;

  let grad: CanvasGradient;
  if (gradient.type === "radial") {
    const radius = Math.hypot(halfW, halfH);
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  } else {
    // Project the box extent onto the angle so the gradient always fills it.
    const rad = ((gradient.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const half = Math.abs(dx) * halfW + Math.abs(dy) * halfH;
    grad = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  }

  for (const stop of gradient.stops) {
    const offset = Math.min(1, Math.max(0, stop.offset));
    grad.addColorStop(offset, stop.color);
  }
  return grad;
}
