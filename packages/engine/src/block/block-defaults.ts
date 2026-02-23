import { BlockType, PropertyValue } from './block.types';

const SHARED_TRANSFORM: Record<string, PropertyValue> = {
  'transform/position/x': 0,
  'transform/position/y': 0,
  'transform/size/width': 100,
  'transform/size/height': 100,
  'transform/rotation': 0,
};

const SHARED_APPEARANCE: Record<string, PropertyValue> = {
  'appearance/opacity': 1,
  'appearance/visible': true,
};

const defaults: Record<BlockType, Record<string, PropertyValue>> = {
  scene: {
    'scene/width': 1080,
    'scene/height': 1080,
  },
  page: {
    'page/width': 1080,
    'page/height': 1080,
    'fill/color': { r: 1, g: 1, b: 1, a: 1 },
  },
  graphic: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    'fill/color': { r: 0.85, g: 0.85, b: 0.85, a: 1 },
    'stroke/color': { r: 0, g: 0, b: 0, a: 0 },
    'stroke/width': 0,
  },
  text: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    'text/content': 'Text',
    'text/fontSize': 24,
    'text/fontFamily': 'Arial',
    'fill/color': { r: 0, g: 0, b: 0, a: 1 },
  },
  image: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
    'image/src': '',
  },
  group: {
    ...SHARED_TRANSFORM,
    ...SHARED_APPEARANCE,
  },
};

export function getBlockDefaults(type: BlockType): Record<string, PropertyValue> {
  return { ...defaults[type] };
}
