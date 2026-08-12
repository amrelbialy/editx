import type { TextRunStyleUpdate } from "@editx/engine";
import { textGradientToCss } from "../../utils/text-gradient-css";
import { convertValidTextRunOverrides } from "../../utils/text-preset-run-style";
import type { PreviewStyle, PreviewTextSegment, TextPresetBlock } from "../config.types";

const BASE_FONT_SIZE = 24;

function em(value: number, referenceFontPx: number): string {
  const rounded = Number((value / referenceFontPx).toFixed(3));
  return `${rounded}em`;
}

function padding(value: NonNullable<TextRunStyleUpdate["backgroundPadding"]>, reference: number) {
  return [value.top ?? 0, value.right ?? 0, value.bottom ?? 0, value.left ?? 0]
    .map((side) => em(side, reference))
    .join(" ");
}

function toPreviewStyle(update: TextRunStyleUpdate, baseReference: number): PreviewStyle {
  const style: PreviewStyle = {};
  const effectiveReference = update.fontSize ?? baseReference;
  if (update.fontSize !== undefined) {
    style.fontSize = update.fontSize === null ? "initial" : em(update.fontSize, baseReference);
  }
  if (update.fontFamily !== undefined) style.fontFamily = update.fontFamily ?? "initial";
  if (update.fontWeight !== undefined) style.fontWeight = update.fontWeight ?? "initial";
  if (update.fontStyle !== undefined) style.fontStyle = update.fontStyle ?? "initial";
  if (update.fill !== undefined) style.color = update.fill ?? "initial";
  if (update.fillGradient !== undefined) {
    style.textGradient = update.fillGradient ? textGradientToCss(update.fillGradient) : null;
  }
  if (update.letterSpacing !== undefined) {
    style.letterSpacing =
      update.letterSpacing === null ? "initial" : em(update.letterSpacing, effectiveReference);
  }
  if (update.textDecoration !== undefined) style.textDecoration = update.textDecoration ?? "none";
  if (update.textTransform !== undefined) style.textTransform = update.textTransform ?? "none";
  if (update.textStrokeWidth !== undefined || update.textStrokeColor !== undefined) {
    const width = update.textStrokeWidth ?? 0;
    style.textStroke =
      width === null
        ? "initial"
        : `${em(width, effectiveReference)} ${update.textStrokeColor ?? "currentColor"}`;
  }
  if (
    update.textShadowColor !== undefined ||
    update.textShadowBlur !== undefined ||
    update.textShadowOffsetX !== undefined ||
    update.textShadowOffsetY !== undefined
  ) {
    if (update.textShadowColor === null) style.textShadow = "none";
    else {
      const x = em(update.textShadowOffsetX ?? 0, effectiveReference);
      const y = em(update.textShadowOffsetY ?? 0, effectiveReference);
      const blur = em(update.textShadowBlur ?? 0, effectiveReference);
      style.textShadow = `${x} ${y} ${blur} ${update.textShadowColor ?? "currentColor"}`;
    }
  }
  if (update.backgroundColor !== undefined)
    style.background = update.backgroundColor ?? "transparent";
  if (update.backgroundOpacity !== undefined)
    style.backgroundOpacity = update.backgroundOpacity ?? 1;
  if (update.backgroundCornerRadius !== undefined) {
    style.borderRadius =
      update.backgroundCornerRadius === null
        ? "0"
        : em(update.backgroundCornerRadius, effectiveReference);
  }
  if (update.backgroundPadding !== undefined) {
    style.padding =
      update.backgroundPadding === null
        ? "0"
        : padding(update.backgroundPadding, effectiveReference);
  }
  return style;
}

export function deriveTextRunPreviewSegments(block: TextPresetBlock): PreviewTextSegment[] {
  const baseReference = BASE_FONT_SIZE * (block.fontSizeScale ?? 1);
  const overrides = convertValidTextRunOverrides(block.text, block.runOverrides, BASE_FONT_SIZE, 1);
  const boundaries = [...new Set(overrides.flatMap(({ start, end }) => [start, end]))].sort(
    (left, right) => left - right,
  );
  const segments: PreviewTextSegment[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const style = overrides.reduce<TextRunStyleUpdate>((resolved, override) => {
      if (override.start <= start && override.end >= end) Object.assign(resolved, override.style);
      return resolved;
    }, {});
    if (Object.keys(style).length > 0)
      segments.push({ start, end, style: toPreviewStyle(style, baseReference) });
  }
  return segments;
}
