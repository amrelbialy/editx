import type { TextLine } from "./formatted-text-utils";
import { applyTextTransform, formatFont } from "./formatted-text-utils";

export interface TextRenderConfig {
  width: number;
  height: number;
  padding: number;
  align: string;
  verticalAlign: string;
  backgroundFill?: string;
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

function drawPartText(
  ctx: CanvasRenderingContext2D,
  displayText: string,
  part: {
    style: {
      letterSpacing: number;
      textStrokeColor: string;
      textStrokeWidth: number;
      fill: string;
    };
    width: number;
  },
  xOffset: number,
  yOffset: number,
  hasShadow: boolean,
): void {
  const hasStroke = !!part.style.textStrokeColor && part.style.textStrokeWidth > 0;
  if (hasStroke) {
    ctx.strokeStyle = part.style.textStrokeColor;
    ctx.lineWidth = part.style.textStrokeWidth;
    ctx.lineJoin = "round";
    drawText(ctx, displayText, xOffset, yOffset, part.style.letterSpacing, true);
  }

  ctx.fillStyle = part.style.fill;
  drawText(ctx, displayText, xOffset, yOffset, part.style.letterSpacing, false);

  if (hasShadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function drawDecoration(
  ctx: CanvasRenderingContext2D,
  part: { style: { textDecoration: string; fontSize: number; fill: string }; width: number },
  xOffset: number,
  yOffset: number,
): void {
  const decoLineWidth = Math.max(1, part.style.fontSize / 15);
  ctx.strokeStyle = part.style.fill;
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

export function renderFormattedText(
  ctx: CanvasRenderingContext2D,
  textLines: TextLine[],
  config: TextRenderConfig,
): void {
  if (textLines.length === 0) return;

  const pad = config.padding;
  const totalWidth = config.width - pad * 2;
  const totalHeight = config.height - pad * 2;

  if (config.backgroundFill) {
    ctx.fillStyle = config.backgroundFill;
    ctx.fillRect(0, 0, config.width, config.height);
  }

  const textHeight = textLines.reduce((sum, l) => sum + l.height, 0);

  let yOffset = pad;
  if (config.verticalAlign === "middle" && totalHeight > 0) {
    yOffset = pad + (totalHeight - textHeight) / 2;
  } else if (config.verticalAlign === "bottom" && totalHeight > 0) {
    yOffset = pad + totalHeight - textHeight;
  }

  ctx.textBaseline = "top";

  for (const line of textLines) {
    let xOffset = pad;
    if (config.align === "center") xOffset = pad + (totalWidth - line.width) / 2;
    else if (config.align === "right") xOffset = pad + totalWidth - line.width;

    const maxFontSize = Math.max(...line.parts.map((p) => p.style.fontSize));

    for (const part of line.parts) {
      ctx.font = formatFont(part.style);
      const displayText = applyTextTransform(part.text, part.style.textTransform);
      const partYOffset = yOffset + (maxFontSize - part.style.fontSize) * 0.8;

      if (part.style.backgroundColor && displayText.length > 0) {
        ctx.fillStyle = part.style.backgroundColor;
        ctx.fillRect(xOffset, partYOffset, part.width, line.height);
      }

      const hasShadow =
        !!part.style.textShadowColor &&
        (part.style.textShadowBlur > 0 ||
          part.style.textShadowOffsetX !== 0 ||
          part.style.textShadowOffsetY !== 0);
      if (hasShadow) {
        ctx.shadowColor = part.style.textShadowColor;
        ctx.shadowBlur = part.style.textShadowBlur;
        ctx.shadowOffsetX = part.style.textShadowOffsetX;
        ctx.shadowOffsetY = part.style.textShadowOffsetY;
      }

      drawPartText(ctx, displayText, part, xOffset, partYOffset, hasShadow);

      if (part.style.textDecoration) {
        drawDecoration(ctx, part, xOffset, partYOffset);
      }

      xOffset += part.width;
    }
    yOffset += line.height;
  }
}
