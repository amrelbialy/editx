import { fillRoundRect } from "./canvas-round-rect";
import {
  computeTextUnionRect,
  hasVisibleGlyphs,
  lineStartX,
  textStartY,
} from "./formatted-text-box";
import { drawTextBackgroundBox, type TextBackgroundBoxStyle } from "./formatted-text-box-render";
import type { CurvedTextLayout } from "./formatted-text-curve";
import { drawDecoration, drawPartText } from "./formatted-text-draw-run";
import type { TextLine } from "./formatted-text-utils";
import { applyTextTransform, formatFont } from "./formatted-text-utils";

export interface TextRenderConfig {
  width: number;
  height: number;
  padding: number;
  align: string;
  verticalAlign: string;
  backgroundFill?: string;
  /** Resolved text background box, or null/undefined when disabled. */
  backgroundBox?: TextBackgroundBoxStyle | null;
}

export function renderFormattedText(
  ctx: CanvasRenderingContext2D,
  textLines: TextLine[],
  config: TextRenderConfig,
): void {
  if (textLines.length === 0) return;

  if (config.backgroundFill) {
    ctx.fillStyle = config.backgroundFill;
    ctx.fillRect(0, 0, config.width, config.height);
  }

  // Inside the empty-text guard by design: unlike the legacy full-frame
  // `fill/enabled` above, the box paints nothing when there is no text — and
  // "no text" means no glyphs, not no lines (an emptied block still lays out
  // one zero-width line).
  if (config.backgroundBox && hasVisibleGlyphs(textLines)) {
    const rect = computeTextUnionRect(textLines, config, config.backgroundBox.padding);
    drawTextBackgroundBox(ctx, rect, config.backgroundBox);
  }

  let yOffset = textStartY(textLines, config);

  ctx.textBaseline = "top";

  for (const line of textLines) {
    let xOffset = lineStartX(line, config);

    const maxFontSize = Math.max(...line.parts.map((p) => p.style.fontSize));

    for (const part of line.parts) {
      ctx.font = formatFont(part.style);
      const displayText = applyTextTransform(part.text, part.style.textTransform);
      const partYOffset = yOffset + (maxFontSize - part.style.fontSize) * 0.8;

      if (part.style.backgroundColor && displayText.length > 0) {
        // Highlight "pill": a rounded box that hugs the run's em box, drawn from
        // the glyph top (partYOffset) down over the full font size. Anchoring it
        // to the em box — not `fontSize + 2·padY` shifted up by padY — means it
        // fills the tightened line box with no empty strip beneath, while the
        // font's intrinsic ascent/descent whitespace reads as balanced vertical
        // padding. Horizontal padding (0.2·em) and radius (0.15·em) are kept.
        const fs = part.style.fontSize;
        const padX = fs * 0.2;
        const radius = fs * 0.15;
        const boxX = Math.max(0, xOffset - padX);
        const boxW = part.width + 2 * padX;
        ctx.fillStyle = part.style.backgroundColor;
        fillRoundRect(ctx, boxX, partYOffset, boxW, fs, radius);
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

/**
 * Render text along an arc. Only invoked when radius > 0 — the flat path above
 * is untouched. Each glyph is drawn centered on its anchor via save / translate
 * / rotate / (stroke+fill) / restore, reusing the flat per-run style application
 * in {@link drawPartText} so stroke, shadow, fill, and letter-spacing all apply.
 */
export function renderCurvedText(ctx: CanvasRenderingContext2D, layout: CurvedTextLayout): void {
  if (layout.glyphs.length === 0) return;

  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const g of layout.glyphs) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rotation);
    ctx.font = formatFont(g.style);

    const hasShadow =
      !!g.style.textShadowColor &&
      (g.style.textShadowBlur > 0 ||
        g.style.textShadowOffsetX !== 0 ||
        g.style.textShadowOffsetY !== 0);
    if (hasShadow) {
      ctx.shadowColor = g.style.textShadowColor;
      ctx.shadowBlur = g.style.textShadowBlur;
      ctx.shadowOffsetX = g.style.textShadowOffsetX;
      ctx.shadowOffsetY = g.style.textShadowOffsetY;
    }

    // Curved text can't build a per-glyph arc gradient; force the solid-fill
    // fallback (allowGradient=false) so curved + gradient renders flat colour.
    drawPartText(ctx, g.char, { style: g.style, width: g.width }, 0, 0, hasShadow, false);
    ctx.restore();
  }

  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
}
