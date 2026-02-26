/**
 * Block property key constants — single source of truth for all property-path strings.
 * Import individual keys where needed to avoid magic strings.
 */

// ── Transform ────────────────────────────────────────
export const POSITION_X = 'transform/position/x' as const;
export const POSITION_Y = 'transform/position/y' as const;
export const SIZE_WIDTH = 'transform/size/width' as const;
export const SIZE_HEIGHT = 'transform/size/height' as const;
export const ROTATION = 'transform/rotation' as const;

// ── Appearance ───────────────────────────────────────
export const OPACITY = 'appearance/opacity' as const;
export const VISIBLE = 'appearance/visible' as const;

// ── Fill & Stroke ────────────────────────────────────
export const FILL_COLOR = 'fill/color' as const;
export const STROKE_COLOR = 'stroke/color' as const;
export const STROKE_WIDTH = 'stroke/width' as const;

// ── Text ─────────────────────────────────────────────
export const TEXT_CONTENT = 'text/content' as const;
export const FONT_SIZE = 'text/fontSize' as const;
export const FONT_FAMILY = 'text/fontFamily' as const;

// ── Image ────────────────────────────────────────────
export const IMAGE_SRC = 'image/src' as const;

// ── Page ─────────────────────────────────────────────
export const PAGE_WIDTH = 'page/width' as const;
export const PAGE_HEIGHT = 'page/height' as const;

// ── Scene ────────────────────────────────────────────
export const SCENE_WIDTH = 'scene/width' as const;
export const SCENE_HEIGHT = 'scene/height' as const;
