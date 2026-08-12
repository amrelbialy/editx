import { textGradientToCss } from "../../utils/text-gradient-css";
import type {
  PresetPreview,
  PreviewBoxStyle,
  PreviewStyle,
  TextBackgroundBoxSpec,
  TextPreset,
  TextPresetBlock,
} from "../config.types";
import { deriveTextRunPreviewSegments } from "./derive-text-run-preview";

/**
 * Base font size the preset scales apply to (must match the insertion default in
 * `use-text-tool.ts`). Scale-dependent effects (letter-spacing, stroke, shadow)
 * are expressed in `em` relative to this reference so the thumbnail matches how
 * the canvas scales those effects by font size — no hand-authored px drift.
 */
const BASE_FONT_SIZE = 24;

/** Round to 3 decimals and drop trailing zeros for compact em strings. */
function em(value: number, referenceFontPx: number): string {
  const n = Number((value / referenceFontPx).toFixed(3));
  return `${n}em`;
}

/**
 * Derive a serializable {@link PresetPreview} from a preset's representative
 * block so the thumbnail reflects the *real* inserted style. Scale-dependent
 * effects are emitted in `em` relative to the block's reference font size.
 */
export function deriveTextPreview(block: TextPresetBlock, sample?: string): PresetPreview {
  const referenceFontPx = BASE_FONT_SIZE * (block.fontSizeScale ?? 1);
  const style: PreviewStyle = {};

  if (block.fontFamily) style.fontFamily = block.fontFamily;
  if (block.fontWeight) style.fontWeight = block.fontWeight;
  if (block.fontStyle) style.fontStyle = block.fontStyle;
  const transform = block.transform ?? block.textTransform;
  if (transform) style.textTransform = transform;

  if (block.fillGradient) {
    style.textGradient = textGradientToCss(block.fillGradient);
  } else if (block.fill) {
    style.color = block.fill;
  }

  if (block.letterSpacing) {
    style.letterSpacing = em(block.letterSpacing, referenceFontPx);
  }

  if (block.textStrokeWidth) {
    style.textStroke = `${em(block.textStrokeWidth, referenceFontPx)} ${block.textStrokeColor ?? "#000000"}`;
  }

  if (
    block.textShadowColor ||
    block.textShadowBlur ||
    block.textShadowOffsetX ||
    block.textShadowOffsetY
  ) {
    const ox = em(block.textShadowOffsetX ?? 0, referenceFontPx);
    const oy = em(block.textShadowOffsetY ?? 0, referenceFontPx);
    const blur = em(block.textShadowBlur ?? 0, referenceFontPx);
    style.textShadow = `${ox} ${oy} ${blur} ${block.textShadowColor ?? "#000000"}`;
  }

  if (block.backgroundColor) style.background = block.backgroundColor;
  if (block.backgroundOpacity !== undefined) style.backgroundOpacity = block.backgroundOpacity;
  if (block.backgroundCornerRadius !== undefined)
    style.borderRadius = em(block.backgroundCornerRadius, referenceFontPx);
  if (block.backgroundPadding !== undefined) {
    const padding = resolvePadding(block.backgroundPadding);
    style.padding = [padding.top, padding.right, padding.bottom, padding.left]
      .map((side) => em(side, referenceFontPx))
      .join(" ");
  }
  if (block.backgroundBox) style.box = deriveBoxStyle(block.backgroundBox, referenceFontPx);

  const previewSample = sample ?? block.text;
  const segments = previewSample === block.text ? deriveTextRunPreviewSegments(block) : undefined;
  return { kind: "text", sample: previewSample, style, segments };
}

/** Resolve authored padding into the four sides, in reference px. */
function resolvePadding(padding: TextBackgroundBoxSpec["padding"]) {
  if (typeof padding === "number")
    return { top: padding, right: padding, bottom: padding, left: padding };
  return {
    top: padding?.top ?? 0,
    right: padding?.right ?? 0,
    bottom: padding?.bottom ?? 0,
    left: padding?.left ?? 0,
  };
}

/** Map a background box onto CSS, in `em` so it tracks the sample font size. */
function deriveBoxStyle(box: TextBackgroundBoxSpec, referenceFontPx: number): PreviewBoxStyle {
  const style: PreviewBoxStyle = { background: box.color };

  if (box.padding !== undefined) {
    const p = resolvePadding(box.padding);
    style.padding = [p.top, p.right, p.bottom, p.left]
      .map((side) => em(side, referenceFontPx))
      .join(" ");
  }
  if (box.cornerRadius) style.borderRadius = em(box.cornerRadius, referenceFontPx);
  if (box.shadow) {
    const ox = em(box.shadow.offsetX ?? 0, referenceFontPx);
    const oy = em(box.shadow.offsetY ?? 0, referenceFontPx);
    const blur = em(box.shadow.blur ?? 0, referenceFontPx);
    style.boxShadow = `${ox} ${oy} ${blur} ${box.shadow.color}`;
  }
  if (box.stroke) {
    style.border = `${em(box.stroke.width, referenceFontPx)} solid ${box.stroke.color}`;
  }

  return style;
}

/**
 * Resolve the preview to render for a text preset: honour a consumer-supplied
 * `preview.style` when present, otherwise derive one from the preset's dominant
 * (largest) block so the built-ins never duplicate their style as hand-authored
 * px preview values, and multi-block combos show their headline — not a kicker.
 */
export function resolveTextPreview(preset: TextPreset): PresetPreview {
  const { preview, blocks } = preset;
  if (preview.kind === "text" && preview.style) return preview;
  const block = dominantBlock(blocks);
  if (!block) return preview;
  const sample = preview.kind === "text" ? preview.sample : block.text;
  const derived = deriveTextPreview(block, sample);
  if (derived.kind !== "text" || !derived.style || derived.style.box) return derived;
  // A boxed preset must never preview as plain text, even when its dominant
  // block isn't the boxed one (e.g. a ticker bar above a larger headline).
  const boxed = blocks.find((b) => b.backgroundBox);
  if (boxed?.backgroundBox) {
    derived.style.box = deriveBoxStyle(
      boxed.backgroundBox,
      BASE_FONT_SIZE * (boxed.fontSizeScale ?? 1),
    );
  }
  return derived;
}

/** The largest block by font scale (first wins ties) — the preset's "voice". */
function dominantBlock(blocks: TextPresetBlock[]): TextPresetBlock | undefined {
  return blocks.reduce<TextPresetBlock | undefined>((best, block) => {
    if (!best) return block;
    return (block.fontSizeScale ?? 1) > (best.fontSizeScale ?? 1) ? block : best;
  }, undefined);
}
