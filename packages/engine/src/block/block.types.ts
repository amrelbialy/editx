export type BlockType =
  | "scene"
  | "page"
  | "graphic"
  | "text"
  | "image"
  | "group"
  | "effect"
  | "shape"
  | "fill";

export type EffectType = "adjustments" | "filter";

/** Shape geometry types — sub-block kinds for type='shape'. */
export type ShapeType = "rect" | "ellipse" | "polygon" | "star" | "line" | "path";

/** Fill content types — sub-block kinds for type='fill'. */
export type FillType = "color" | "gradient" | "image";

/** Gradient geometry type for a gradient fill. */
export type GradientType = "linear" | "radial";

/** How an image fill is fitted into the shape bounds. */
export type ImageFillFit = "cover" | "contain" | "tile" | "stretch";

/**
 * A single gradient color stop.
 * `offset` is a 0..1 position along the gradient axis; `color` is a CSS color
 * string (hex or rgba) — chosen over {@link Color} so stops serialize compactly,
 * map straight onto Konva `ColorStops`, and match `TextRunStyle.fill`.
 */
export interface GradientStop {
  offset: number;
  color: string;
}

/** Resolved gradient fill descriptor returned by `getFillGradient`. */
export interface GradientFill {
  type: GradientType;
  /** Gradient angle in degrees (linear only; ignored for radial). */
  angle: number;
  stops: GradientStop[];
}

/** Resolved image (pattern) fill descriptor returned by `getFillImage`. */
export interface ImageFill {
  src: string;
  fit: ImageFillFit;
  offsetX: number;
  offsetY: number;
  scale: number;
}

/** Direction a curved text baseline bows. */
export type TextCurveDirection = "up" | "down";

/** Resolved curved-text descriptor returned by `getTextCurve` (null when flat). */
export interface TextCurve {
  /** Arc radius in px. `0` (or absent) renders flat. */
  radius: number;
  direction: TextCurveDirection;
}

/** Per-side padding, in px, between the text bounds and the background box edge. */
export interface TextBackgroundPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Fully-resolved text background box descriptor returned by `getTextBackground`. */
export interface TextBackground {
  enabled: boolean;
  color: Color;
  /** px; render clamps to min(w,h)/2, the stored value is returned as-is. */
  cornerRadius: number;
  padding: TextBackgroundPadding;
}

/** Partial update for `setTextBackground` — omitted keys are left untouched. */
export interface TextBackgroundOptions {
  enabled?: boolean;
  color?: Color;
  cornerRadius?: number;
  /** number = all four sides; object = per-side merge. */
  padding?: number | Partial<TextBackgroundPadding>;
}

/** SVG-path viewBox extents used to scale path `d` data into block bounds. */
export interface PathViewBox {
  width: number;
  height: number;
}

export type PageLayoutMode = "VerticalStack" | "HorizontalStack" | "DepthStack" | "Free";

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Text case transform applied at render (original text preserved in the model). */
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

/**
 * A flat linear/radial gradient fill for a text run. Reuses the shared
 * {@link GradientType}/{@link GradientStop} shapes from the shape-fill work.
 * `angle` is in degrees for linear (default 0); radial ignores it.
 */
export interface TextGradient {
  type: GradientType;
  angle?: number;
  stops: GradientStop[];
}

/** Style properties that can vary per text run (character-level). */
export interface TextRunStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  /** Gradient fill for the run. When set it overrides the solid `fill`. */
  fillGradient?: TextGradient;
  letterSpacing?: number;
  textDecoration?: string;
  backgroundColor?: string;
  textTransform?: TextTransform;
  textShadowColor?: string;
  textShadowBlur?: number;
  textShadowOffsetX?: number;
  textShadowOffsetY?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
}

/** A contiguous segment of text with uniform styling. */
export interface TextRun {
  text: string;
  style: TextRunStyle;
}

/**
 * Partial run-style update: `undefined` leaves a property untouched (so a
 * partial edit never clobbers siblings), `null` explicitly clears it.
 */
export type TextRunStyleUpdate = {
  [K in keyof TextRunStyle]?: TextRunStyle[K] | null;
};

export type PropertyValue = number | string | boolean | Color | TextRun[] | GradientStop[];

export interface BlockData {
  id: number;
  type: BlockType;
  kind: string;
  name: string;
  parentId: number | null;
  children: number[];
  effectIds: number[];
  /** Shape sub-block reference (graphic blocks only). */
  shapeId: number | null;
  /** Fill sub-block reference (graphic blocks only). */
  fillId: number | null;
  properties: Record<string, PropertyValue>;
}

/** Recursively marks every property of `T` as readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** A read-only projection of {@link BlockData} returned by query APIs. */
export type ReadonlyBlockData = DeepReadonly<BlockData>;
