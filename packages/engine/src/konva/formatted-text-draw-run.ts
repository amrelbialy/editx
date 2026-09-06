import type { StrokeGradient, TextGradient } from "../block/block.types";
import { buildTextGradient } from "./formatted-text-gradient";

/** Minimal shape a run must expose to be painted (flat run or curved glyph). */
export interface DrawablePart {
  style: {
    letterSpacing: number;
    textStrokeColor: string;
    textStrokeWidth: number;
    textStrokeGradient?: StrokeGradient;
    fill: string;
    fillGradient?: TextGradient;
    fontSize: number;
  };
  width: number;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  stroke: boolean,
): void {
  const draw = stroke ? ctx.strokeText.bind(ctx) : ctx.fillText.bind(ctx);
  if (letterSpacing !== 0 && text.length > 0) {
    let charX = x;
    for (let i = 0; i < text.length; i++) {
      draw(text[i], charX, y);
      charX += ctx.measureText(text[i]).width + letterSpacing;
    }
  } else {
    draw(text, x, y);
  }
}

export function drawPartText(
  ctx: CanvasRenderingContext2D,
  displayText: string,
  part: DrawablePart,
  xOffset: number,
  yOffset: number,
  hasShadow: boolean,
  allowGradient = true,
): void {
  const strokeStyle = resolveStrokeStyle(ctx, part, xOffset, yOffset, allowGradient);
  if (strokeStyle != null && part.style.textStrokeWidth > 0) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = part.style.textStrokeWidth;
    ctx.lineJoin = "round";
    drawText(ctx, displayText, xOffset, yOffset, part.style.letterSpacing, true);
  }

  ctx.fillStyle = resolveFillStyle(ctx, part, xOffset, yOffset, allowGradient);
  drawText(ctx, displayText, xOffset, yOffset, part.style.letterSpacing, false);

  if (hasShadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function resolveStrokeStyle(
  ctx: CanvasRenderingContext2D,
  part: DrawablePart,
  xOffset: number,
  yOffset: number,
  allowGradient: boolean,
): string | CanvasGradient | null {
  const gradient = part.style.textStrokeGradient;
  if (!gradient || gradient.stops.length === 0 || gradient.type !== "linear") {
    return part.style.textStrokeColor || null;
  }
  if (!allowGradient) return part.style.textStrokeColor || gradient.stops[0].color;
  if (part.width <= 0) return part.style.textStrokeColor || null;
  return buildTextGradient(ctx, gradient, {
    x: xOffset,
    y: yOffset,
    width: part.width,
    height: part.style.fontSize,
  });
}

/**
 * Pick the fill for a run. A flat run with a gradient builds a CanvasGradient
 * across its local box. Curved text (`allowGradient=false`) can't span an arc
 * per-glyph, so it falls back to the solid `fill` — or the first stop's color
 * when no solid fill was set — keeping curved+gradient a reasonable flat color.
 */
function resolveFillStyle(
  ctx: CanvasRenderingContext2D,
  part: {
    style: { fill: string; fillGradient?: TextGradient; fontSize: number };
    width: number;
  },
  xOffset: number,
  yOffset: number,
  allowGradient: boolean,
): string | CanvasGradient {
  const grad = part.style.fillGradient;
  if (!grad || grad.stops.length === 0) return part.style.fill;
  if (!allowGradient) return part.style.fill || grad.stops[0].color;
  return buildTextGradient(ctx, grad, {
    x: xOffset,
    y: yOffset,
    width: part.width,
    height: part.style.fontSize,
  });
}

export function drawDecoration(
  ctx: CanvasRenderingContext2D,
  part: {
    style: { textDecoration: string; fontSize: number; fill: string; fillGradient?: TextGradient };
    width: number;
  },
  xOffset: number,
  yOffset: number,
): void {
  const decoLineWidth = Math.max(1, part.style.fontSize / 15);
  // Match the run's fill so underline/strike-through follow a gradient too.
  ctx.strokeStyle = resolveFillStyle(ctx, part, xOffset, yOffset, true);
  ctx.lineWidth = decoLineWidth;
  ctx.beginPath();
  if (part.style.textDecoration.includes("underline")) {
    const underY = yOffset + part.style.fontSize;
    ctx.moveTo(xOffset, underY);
    ctx.lineTo(xOffset + part.width, underY);
  }
  if (part.style.textDecoration.includes("line-through")) {
    const strikeY = yOffset + part.style.fontSize / 2;
    ctx.moveTo(xOffset, strikeY);
    ctx.lineTo(xOffset + part.width, strikeY);
  }
  ctx.stroke();
}
