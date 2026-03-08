import { BlockType, PropertyValue } from './block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  IMAGE_SRC, IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT, IMAGE_ROTATION,
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_SCALE_X, CROP_SCALE_Y, CROP_ROTATION, CROP_SCALE_RATIO,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL, CROP_ASPECT_RATIO_LOCKED,
  PAGE_WIDTH, PAGE_HEIGHT,
  PAGE_MARGIN_ENABLED, PAGE_MARGIN_TOP, PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_LEFT, PAGE_MARGIN_RIGHT,
  PAGE_TITLE_TEMPLATE,
  SCENE_WIDTH, SCENE_HEIGHT,
  SCENE_PAGE_DIMS_WIDTH, SCENE_PAGE_DIMS_HEIGHT,
  SCENE_ASPECT_RATIO_LOCK, SCENE_LAYOUT,
} from './property-keys';

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

const defaults: Record<BlockType, Record<string, PropertyValue>> = {
  scene: {
    [SCENE_WIDTH]: 1080,
    [SCENE_HEIGHT]: 1080,
    [SCENE_PAGE_DIMS_WIDTH]: 1080,
    [SCENE_PAGE_DIMS_HEIGHT]: 1080,
    [SCENE_ASPECT_RATIO_LOCK]: false,
    [SCENE_LAYOUT]: 'Free',
  },
  page: {
    [PAGE_WIDTH]: 1080,
    [PAGE_HEIGHT]: 1080,
    [FILL_COLOR]: { r: 1, g: 1, b: 1, a: 1 },
    // Appearance
    [OPACITY]: 1,
    [VISIBLE]: true,
    // Image fill (dual-mode: empty = color rect, non-empty = Konva.Image)
    [IMAGE_SRC]: '',
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
    [PAGE_TITLE_TEMPLATE]: 'Page {{page_index}}',
  },
  graphic: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [FILL_COLOR]: { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    [STROKE_COLOR]: { r: 0, g: 0, b: 0, a: 0 },
    [STROKE_WIDTH]: 0,
  },
  text: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [TEXT_CONTENT]: 'Text',
    [FONT_SIZE]: 24,
    [FONT_FAMILY]: 'Arial',
    [FILL_COLOR]: { r: 0, g: 0, b: 0, a: 1 },
  },
  image: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    [IMAGE_SRC]: '',
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
};

export function getBlockDefaults(type: BlockType): Record<string, PropertyValue> {
  return structuredClone(defaults[type]);
}
