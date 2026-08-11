import type { FillType, GradientStop, ShapeType } from "@editx/engine";

/**
 * A selectable text style in the legacy Text tool grid (Title, Heading, …).
 * Retained for back-compat; mapped onto the gallery model at read time.
 */
export interface TextStylePreset {
  /** Stable id (also the grid item test id). */
  id: string;
  /** Label shown in the grid. */
  label: string;
  /** Default text content inserted for the block. */
  text?: string;
  /** Multiplier applied to `defaultFontSize`. Default `1`. */
  fontSizeScale?: number;
  /** Font weight for this preset (overrides `defaultFontWeight`). */
  fontWeight?: "normal" | "bold";
}

/**
 * A named category of presets shown as one row in the gallery. Generic over the
 * preset type so it serves both text (`TextPreset`) and shapes (`ShapePreset`).
 */
export interface PresetGroup<T> {
  /** Stable category id (also the merge key for `additionalPresetGroups`). */
  id: string;
  /** Display label (fallback when `labelKey` has no translation). */
  label: string;
  /** i18n key resolved by the gallery; falls back to `label`. */
  labelKey?: string;
  presets: T[];
}

/**
 * CSS-shaped hints for the block-level background box drawn behind the whole
 * text preview — distinct from the run-level highlight pill (`background`).
 */
export interface PreviewBoxStyle {
  background: string;
  borderRadius?: string;
  padding?: string;
  boxShadow?: string;
  border?: string;
}

/**
 * CSS-shaped hints the (gate-9) thumbnail component maps onto inline styles.
 * Kept as plain strings so a `PresetPreview` stays JSON-serializable and the
 * `ui/` thumbnail never needs to import engine or config types.
 */
export interface PreviewStyle {
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  letterSpacing?: string;
  textTransform?: string;
  /** Maps to `-webkit-text-stroke`. */
  textStroke?: string;
  textShadow?: string;
  /** Solid colour or gradient for a shape/text swatch (text: highlight box). */
  background?: string;
  /**
   * CSS gradient string painted onto the glyphs via `background-clip: text`
   * (mirrors an inserted `fillGradient`). Takes precedence over `color`.
   */
  textGradient?: string;
  /** `url(...)` / gradient for an image-filled preview. */
  backgroundImage?: string;
  borderRadius?: string;
  clipPath?: string;
  border?: string;
  /** Block-level background box behind the whole sample (text previews). */
  box?: PreviewBoxStyle;
}

/** Box padding: one value for all four sides, or per side. */
export type TextBoxPadding =
  | number
  | { top?: number; right?: number; bottom?: number; left?: number };

/**
 * Block-level background box painted behind a whole text block — distinct from
 * the per-run `backgroundColor` highlight. Every length is authored against the
 * 1080 reference edge and multiplied by the canvas scale factor at insertion,
 * like `letterSpacing` / `textStrokeWidth` / `textShadow*`.
 */
export interface TextBackgroundBoxSpec {
  /** Box fill as a hex string; converted to an engine `Color` at insertion. */
  color: string;
  padding?: TextBoxPadding;
  cornerRadius?: number;
  /** Box drop shadow (block shadow API); inert unless the box is enabled. */
  shadow?: { color: string; offsetX?: number; offsetY?: number; blur?: number };
  /** Box outline; same shape as `ShapePreset["stroke"]`. */
  stroke?: { color: string; width: number };
}

/**
 * A plain, serializable descriptor of how to draw a preset thumbnail. Never a
 * React node — the thumbnail component interprets it into CSS.
 */
export type PresetPreview =
  | { kind: "text"; sample: string; style?: PreviewStyle }
  | { kind: "shape"; style?: PreviewStyle };

/** Content + visual style for a text block, independent of page geometry. */
export interface TextStyleSpec {
  text: string;
  /** Multiplier applied to `text.defaultFontSize` (× canvas scale). */
  fontSizeScale?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textShadowColor?: string;
  textShadowBlur?: number;
  textShadowOffsetX?: number;
  textShadowOffsetY?: number;
  /** Per-run highlight box painted behind the glyphs. */
  backgroundColor?: string;
  /** Block-level background box behind the whole block (suppressed when curved). */
  backgroundBox?: TextBackgroundBoxSpec;
  /**
   * Gradient text fill applied after insertion via `setTextGradient`. Not
   * combined with `curve` (curve wins; gradient is skipped when curved).
   */
  fillGradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: { offset: number; color: string }[];
  };
  align?: "left" | "center" | "right";
  lineHeight?: number;
  curve?: { radius: number; direction: "up" | "down" };
}

/**
 * Authoring geometry for a text block as normalized page fractions (0..1), so
 * presets stay resolution-independent. All four are required together.
 */
export interface TextLayoutSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Forbids any layout field, so geometry is all-or-nothing on a block. */
type NoLayout = { [K in keyof TextLayoutSpec]?: never };

/**
 * One text block within a (possibly multi-block) text preset. Layout is
 * all-or-nothing: either author full geometry (composition presets) or omit it
 * entirely (style presets) to let the engine auto-size and center the block.
 */
export type TextPresetBlock = TextStyleSpec & (TextLayoutSpec | NoLayout);

/** A one-click text preset: one or more styled blocks, optionally grouped. */
export interface TextPreset {
  id: string;
  label: string;
  blocks: TextPresetBlock[];
  /** Group inserted blocks into one unit. Defaults to `blocks.length > 1`. */
  group?: boolean;
  preview: PresetPreview;
}

/** A one-click shape preset with geometry, fill, stroke, and preview. */
export interface ShapePreset {
  id: string;
  label: string;
  shape: {
    kind: ShapeType;
    sides?: number;
    points?: number;
    innerDiameter?: number;
    cornerRadius?: number;
    pathData?: string;
    viewBox?: { width: number; height: number };
  };
  fill: {
    kind: FillType;
    color?: string;
    gradient?: { type: "linear" | "radial"; angle?: number; stops: GradientStop[] };
    image?: { src: string; fit?: "cover" | "contain" | "tile" | "stretch" };
  };
  stroke?: { color: string; width: number };
  /** Starting size as a fraction of the smaller canvas edge (0..1). */
  sizeFraction?: number;
  preview: PresetPreview;
}
