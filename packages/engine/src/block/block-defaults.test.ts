import { describe, it, expect } from 'vitest';
import { getBlockDefaults } from './block-defaults';
import type { BlockType, Color } from './block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  IMAGE_SRC,
  PAGE_WIDTH, PAGE_HEIGHT,
  SCENE_WIDTH, SCENE_HEIGHT,
} from './property-keys';

const ALL_TYPES: BlockType[] = ['scene', 'page', 'graphic', 'text', 'image', 'group'];

describe('getBlockDefaults', () => {
  it('returns defaults for every block type', () => {
    for (const type of ALL_TYPES) {
      const defaults = getBlockDefaults(type);
      expect(defaults).toBeDefined();
      expect(typeof defaults).toBe('object');
    }
  });

  it('returns a fresh copy each call (mutation isolation)', () => {
    const a = getBlockDefaults('graphic');
    const b = getBlockDefaults('graphic');
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different references

    // Mutating one doesn't affect the other
    a[POSITION_X] = 999;
    const c = getBlockDefaults('graphic');
    expect(c[POSITION_X]).toBe(0);
  });

  describe('scene defaults', () => {
    it('has scene width and height', () => {
      const d = getBlockDefaults('scene');
      expect(d[SCENE_WIDTH]).toBe(1080);
      expect(d[SCENE_HEIGHT]).toBe(1080);
    });
  });

  describe('page defaults', () => {
    it('has page width, height, and fill color', () => {
      const d = getBlockDefaults('page');
      expect(d[PAGE_WIDTH]).toBe(1080);
      expect(d[PAGE_HEIGHT]).toBe(1080);
      const fill = d[FILL_COLOR] as Color;
      expect(fill).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });
  });

  describe('graphic defaults', () => {
    it('has transform, appearance, fill, stroke', () => {
      const d = getBlockDefaults('graphic');
      expect(d[POSITION_X]).toBe(0);
      expect(d[POSITION_Y]).toBe(0);
      expect(d[SIZE_WIDTH]).toBe(100);
      expect(d[SIZE_HEIGHT]).toBe(100);
      expect(d[ROTATION]).toBe(0);
      expect(d[OPACITY]).toBe(1);
      expect(d[VISIBLE]).toBe(true);
      expect(d[FILL_COLOR]).toBeDefined();
      expect(d[STROKE_WIDTH]).toBe(0);
    });
  });

  describe('text defaults', () => {
    it('has transform, appearance, and text properties', () => {
      const d = getBlockDefaults('text');
      expect(d[TEXT_CONTENT]).toBe('Text');
      expect(d[FONT_SIZE]).toBe(24);
      expect(d[FONT_FAMILY]).toBe('Arial');
      expect(d[POSITION_X]).toBe(0);
      expect(d[OPACITY]).toBe(1);
    });
  });

  describe('image defaults', () => {
    it('has transform, appearance, and image src', () => {
      const d = getBlockDefaults('image');
      expect(d[IMAGE_SRC]).toBe('');
      expect(d[POSITION_X]).toBe(0);
      expect(d[OPACITY]).toBe(1);
    });
  });

  describe('group defaults', () => {
    it('has transform and appearance only', () => {
      const d = getBlockDefaults('group');
      expect(d[POSITION_X]).toBe(0);
      expect(d[OPACITY]).toBe(1);
      expect(d[VISIBLE]).toBe(true);
      // groups should not have text/image/fill defaults
      expect(d[TEXT_CONTENT]).toBeUndefined();
      expect(d[IMAGE_SRC]).toBeUndefined();
    });
  });

  it('Color objects in defaults are independent copies', () => {
    const a = getBlockDefaults('page');
    const b = getBlockDefaults('page');
    const colorA = a[FILL_COLOR] as Color;
    const colorB = b[FILL_COLOR] as Color;
    expect(colorA).toEqual(colorB);
    expect(colorA).not.toBe(colorB);
  });
});
