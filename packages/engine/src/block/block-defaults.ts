import type { BlockType, PropertyValue } from "./block.types";
import {
  CROP_ASPECT_RATIO_LOCKED,
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_ROTATION,
  CROP_SCALE_RATIO,
  CROP_SCALE_X,
  CROP_SCALE_Y,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  EFFECT_ADJUSTMENTS_BLACKS,
  EFFECT_ADJUSTMENTS_BRIGHTNESS,
  EFFECT_ADJUSTMENTS_CLARITY,
  EFFECT_ADJUSTMENTS_CONTRAST,
  EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_SHADOWS,
  EFFECT_ADJUSTMENTS_SHARPNESS,
  EFFECT_ADJUSTMENTS_TEMPERATURE,
  EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_ENABLED,
  EFFECT_FILTER_NAME,
  FILL_COLOR,
  FILL_ENABLED,
  FILL_SOLID_COLOR,
  FONT_FAMILY,
  FONT_SIZE,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  IMAGE_ROTATION,
  IMAGE_SRC,
  OPACITY,
  PAGE_HEIGHT,
  PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_ENABLED,
  PAGE_MARGIN_LEFT,
  PAGE_MARGIN_RIGHT,
  PAGE_MARGIN_TOP,
  PAGE_TITLE_TEMPLATE,
  PAGE_WIDTH,
  POSITION_X,
  POSITION_Y,
  ROTATION,
  SCENE_ASPECT_RATIO_LOCK,
  SCENE_HEIGHT,
  SCENE_LAYOUT,
  SCENE_PAGE_DIMS_HEIGHT,
  SCENE_PAGE_DIMS_WIDTH,
  SCENE_WIDTH,
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_POLYGON_SIDES,
  SHAPE_RECT_CORNER_RADIUS,
  SHAPE_STAR_INNER_DIAMETER,
  SHAPE_STAR_POINTS,
  SIZE_HEIGHT,
  SIZE_WIDTH,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_WIDTH,
  TEXT_ALIGN,
  TEXT_AUTO_HEIGHT,
  TEXT_CONTENT,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
  TEXT_RUNS,
  TEXT_VERTICAL_ALIGN,
  TEXT_WRAP,
  VISIBLE,
} from "./property-keys";

const SHARED_TRANSFORM: Record<string, PropertyValue> = {
  [POSITION_X]: 0,
  [POSITION_Y]: 0,
  [SIZE_WIDTH]: 100,
  [SIZE_HEIGHT]: 100,
  [ROTATION]: 0,
};

const SHARED_APPEARANCE: Record<string, PropertyValue> = {
  [OPACITY]: 1,
  [VISIBLE]: true,
};

/** Default properties for an 'adjustments' effect block. */
const ADJUSTMENTS_EFFECT_DEFAULTS: Record<string, PropertyValue> = {
  [EFFECT_ENABLED]: true,
  [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0,
  [EFFECT_ADJUSTMENTS_SATURATION]: 0,
  [EFFECT_ADJUSTMENTS_CONTRAST]: 0,
  [EFFECT_ADJUSTMENTS_GAMMA]: 0,
  [EFFECT_ADJUSTMENTS_CLARITY]: 0,
  [EFFECT_ADJUSTMENTS_EXPOSURE]: 0,
  [EFFECT_ADJUSTMENTS_SHADOWS]: 0,
  [EFFECT_ADJUSTMENTS_HIGHLIGHTS]: 0,
  [EFFECT_ADJUSTMENTS_BLACKS]: 0,
  [EFFECT_ADJUSTMENTS_WHITES]: 0,
  [EFFECT_ADJUSTMENTS_TEMPERATURE]: 0,
  [EFFECT_ADJUSTMENTS_SHARPNESS]: 0,
};

const defaults: Record<BlockType, Record<string, PropertyValue>> = {
  scene: {
    [SCENE_WIDTH]: 1080,
    [SCENE_HEIGHT]: 1080,
    [SCENE_PAGE_DIMS_WIDTH]: 1080,
    [SCENE_PAGE_DIMS_HEIGHT]: 1080,
    [SCENE_ASPECT_RATIO_LOCK]: false,
    [SCENE_LAYOUT]: "Free",
  },
  page: {
    [PAGE_WIDTH]: 1080,
    [PAGE_HEIGHT]: 1080,
    [FILL_COLOR]: { r: 1, g: 1, b: 1, a: 1 },
    // Appearance
    [OPACITY]: 1,
    [VISIBLE]: true,
    // Image fill (dual-mode: empty = color rect, non-empty = Konva.Image)
    [IMAGE_SRC]: "",
    [IMAGE_ORIGINAL_WIDTH]: 0,
    [IMAGE_ORIGINAL_HEIGHT]: 0,
    [IMAGE_ROTATION]: 0,
    // Crop properties (active when IMAGE_SRC is set)
    [CROP_X]: 0,
    [CROP_Y]: 0,
    [CROP_WIDTH]: 0,
    [CROP_HEIGHT]: 0,
    [CROP_ENABLED]: false,
    [CROP_SCALE_X]: 1,
    [CROP_SCALE_Y]: 1,
    [CROP_ROTATION]: 0,
    [CROP_SCALE_RATIO]: 1,
    [CROP_FLIP_HORIZONTAL]: false,
    [CROP_FLIP_VERTICAL]: false,
    [CROP_ASPECT_RATIO_LOCKED]: false,
    // Margins
    [PAGE_MARGIN_ENABLED]: false,
    [PAGE_MARGIN_TOP]: 0,
    [PAGE_MARGIN_BOTTOM]: 0,
    [PAGE_MARGIN_LEFT]: 0,
    [PAGE_MARGIN_RIGHT]: 0,
    // Title
    [PAGE_TITLE_TEMPLATE]: "Page {{page_index}}",
  },
  graphic: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [FILL_COLOR]: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    [STROKE_COLOR]: { r: 0, g: 0, b: 0, a: 0 },
    [STROKE_WIDTH]: 0,
    [FILL_ENABLED]: true,
    [STROKE_ENABLED]: false,
    [SHADOW_ENABLED]: false,
    [SHADOW_COLOR]: { r: 0, g: 0, b: 0, a: 0.5 },
    [SHADOW_OFFSET_X]: 4,
    [SHADOW_OFFSET_Y]: 4,
    [SHADOW_BLUR]: 8,
  },
  text: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [TEXT_CONTENT]: "Text",
    [FONT_SIZE]: 24,
    [FONT_FAMILY]: "Arial",
    [FILL_COLOR]: { r: 0, g: 0, b: 0, a: 1 },
    [TEXT_RUNS]: [
      {
        text: "Text",
        style: {
          fontSize: 24,
          fontFamily: "Arial",
          fontWeight: "normal",
          fontStyle: "normal",
          fill: "#000000",
          letterSpacing: 0,
        },
      },
    ],
    [TEXT_ALIGN]: "left",
    [TEXT_LINE_HEIGHT]: 1.2,
    [TEXT_VERTICAL_ALIGN]: "top",
    [TEXT_PADDING]: 4,
    [TEXT_WRAP]: "word",
    [TEXT_AUTO_HEIGHT]: true,
  },
  image: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [IMAGE_SRC]: "",
    [IMAGE_ORIGINAL_WIDTH]: 0,
    [IMAGE_ORIGINAL_HEIGHT]: 0,
    [IMAGE_ROTATION]: 0,
    [CROP_X]: 0,
    [CROP_Y]: 0,
    [CROP_WIDTH]: 0,
    [CROP_HEIGHT]: 0,
    [CROP_ENABLED]: false,
    [CROP_SCALE_X]: 1,
    [CROP_SCALE_Y]: 1,
    [CROP_ROTATION]: 0,
    [CROP_SCALE_RATIO]: 1,
    [CROP_FLIP_HORIZONTAL]: false,
    [CROP_FLIP_VERTICAL]: false,
    [CROP_ASPECT_RATIO_LOCKED]: false,
  },
  group: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
  },
  effect: {
    [EFFECT_ENABLED]: true,
  },
  shape: {},
  fill: {},
};

export function getBlockDefaults(type: BlockType): Record<string, PropertyValue> {
  return structuredClone(defaults[type]);
}

/** Default properties for a 'filter' effect block. */
const FILTER_EFFECT_DEFAULTS: Record<string, PropertyValue> = {
  [EFFECT_ENABLED]: true,
  [EFFECT_FILTER_NAME]: "",
};

/** Effect-kind-specific defaults (merged on top of base effect defaults). */
const effectKindDefaults: Record<string, Record<string, PropertyValue>> = {
  adjustments: ADJUSTMENTS_EFFECT_DEFAULTS,
  filter: FILTER_EFFECT_DEFAULTS,
};

export function getEffectDefaults(kind: string): Record<string, PropertyValue> {
  const base = structuredClone(defaults.effect);
  const kindProps = effectKindDefaults[kind];
  if (kindProps) {
    Object.assign(base, structuredClone(kindProps));
  }
  return base;
}

// ── Shape sub-block defaults ─────────────────────────

const shapeKindDefaults: Record<string, Record<string, PropertyValue>> = {
  rect: {
    [SHAPE_RECT_CORNER_RADIUS]: 0,
  },
  ellipse: {},
  polygon: {
    [SHAPE_POLYGON_SIDES]: 5,
  },
  star: {
    [SHAPE_STAR_POINTS]: 5,
    [SHAPE_STAR_INNER_DIAMETER]: 0.5,
  },
  line: {
    [SHAPE_LINE_POINTER_LENGTH]: 15,
    [SHAPE_LINE_POINTER_WIDTH]: 15,
  },
};

export function getShapeDefaults(kind: string): Record<string, PropertyValue> {
  const base = structuredClone(defaults.shape);
  const kindProps = shapeKindDefaults[kind];
  if (kindProps) {
    Object.assign(base, structuredClone(kindProps));
  }
  return base;
}

// ── Fill sub-block defaults ──────────────────────────

const fillKindDefaults: Record<string, Record<string, PropertyValue>> = {
  color: {
    [FILL_SOLID_COLOR]: { r: 0.29, g: 0.56, b: 0.89, a: 1 },
  },
};

export function getFillDefaults(kind: string): Record<string, PropertyValue> {
  const base = structuredClone(defaults.fill);
  const kindProps = fillKindDefaults[kind];
  if (kindProps) {
    Object.assign(base, structuredClone(kindProps));
  }
  return base;
}
