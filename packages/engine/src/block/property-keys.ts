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
export const IMAGE_ORIGINAL_WIDTH = 'image/originalWidth' as const;
export const IMAGE_ORIGINAL_HEIGHT = 'image/originalHeight' as const;

// ── Crop ─────────────────────────────────────────────
export const CROP_X = 'crop/x' as const;
export const CROP_Y = 'crop/y' as const;
export const CROP_WIDTH = 'crop/width' as const;
export const CROP_HEIGHT = 'crop/height' as const;
export const CROP_ENABLED = 'crop/enabled' as const;
export const CROP_SCALE_X = 'crop/scaleX' as const;
export const CROP_SCALE_Y = 'crop/scaleY' as const;
export const CROP_ROTATION = 'crop/rotation' as const;
export const CROP_SCALE_RATIO = 'crop/scaleRatio' as const;
export const CROP_FLIP_HORIZONTAL = 'crop/flipHorizontal' as const;
export const CROP_FLIP_VERTICAL = 'crop/flipVertical' as const;
export const CROP_ASPECT_RATIO_LOCKED = 'crop/aspectRatioLocked' as const;

// ── Page ─────────────────────────────────────────────
export const PAGE_WIDTH = 'page/width' as const;
export const PAGE_HEIGHT = 'page/height' as const;
export const PAGE_MARGIN_ENABLED = 'page/marginEnabled' as const;
export const PAGE_MARGIN_TOP = 'page/margin/top' as const;
export const PAGE_MARGIN_BOTTOM = 'page/margin/bottom' as const;
export const PAGE_MARGIN_LEFT = 'page/margin/left' as const;
export const PAGE_MARGIN_RIGHT = 'page/margin/right' as const;
export const PAGE_TITLE_TEMPLATE = 'page/titleTemplate' as const;

// ── Scene ────────────────────────────────────────────
export const SCENE_WIDTH = 'scene/width' as const;
export const SCENE_HEIGHT = 'scene/height' as const;
export const SCENE_PAGE_DIMS_WIDTH = 'scene/pageDimensions/width' as const;
export const SCENE_PAGE_DIMS_HEIGHT = 'scene/pageDimensions/height' as const;
export const SCENE_ASPECT_RATIO_LOCK = 'scene/aspectRatioLock' as const;
export const SCENE_LAYOUT = 'scene/layout' as const;
