import { BlockType, PropertyValue } from './block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  IMAGE_SRC,
  PAGE_WIDTH, PAGE_HEIGHT,
  SCENE_WIDTH, SCENE_HEIGHT,
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
  },
  page: {
    [PAGE_WIDTH]: 1080,
    [PAGE_HEIGHT]: 1080,
    [FILL_COLOR]: { r: 1, g: 1, b: 1, a: 1 },
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
  },
  group: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
  },
};

export function getBlockDefaults(type: BlockType): Record<string, PropertyValue> {
  return structuredClone(defaults[type]);
}
