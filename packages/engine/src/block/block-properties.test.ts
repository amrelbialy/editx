import { describe, it, expect, beforeEach } from 'vitest';
import { BlockProperties } from './block-properties';
import type { BlockData, Color } from './block.types';

function makeBlock(id: number): BlockData {
  return {
    id,
    type: 'graphic',
    kind: '',
    name: `block-${id}`,
    parentId: null,
    children: [],
    effectIds: [],
    shapeId: null,
    fillId: null,
    properties: {},
  };
}

describe('BlockProperties', () => {
  let blocks: Map<number, BlockData>;
  let props: BlockProperties;

  beforeEach(() => {
    blocks = new Map();
    props = new BlockProperties(blocks);
  });

  describe('setProperty / getProperty', () => {
    it('sets and gets a number property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'x', 42);
      expect(props.getProperty(1, 'x')).toBe(42);
    });

    it('sets and gets a string property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'name', 'hello');
      expect(props.getProperty(1, 'name')).toBe('hello');
    });

    it('sets and gets a boolean property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'visible', true);
      expect(props.getProperty(1, 'visible')).toBe(true);
    });

    it('sets and gets a Color property', () => {
      blocks.set(1, makeBlock(1));
      const color: Color = { r: 1, g: 0, b: 0.5, a: 0.8 };
      props.setProperty(1, 'fill', color);
      expect(props.getProperty(1, 'fill')).toEqual(color);
    });

    it('returns undefined for non-existent property', () => {
      blocks.set(1, makeBlock(1));
      expect(props.getProperty(1, 'nope')).toBeUndefined();
    });

    it('returns undefined for non-existent block', () => {
      expect(props.getProperty(999, 'x')).toBeUndefined();
    });

    it('does nothing when setting on non-existent block', () => {
      // Should not throw
      props.setProperty(999, 'x', 5);
    });
  });

  describe('getFloat', () => {
    it('returns the number value', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'x', 3.14);
      expect(props.getFloat(1, 'x')).toBe(3.14);
    });

    it('returns 0 for non-number property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'x', 'hello');
      expect(props.getFloat(1, 'x')).toBe(0);
    });

    it('returns 0 for missing property', () => {
      blocks.set(1, makeBlock(1));
      expect(props.getFloat(1, 'missing')).toBe(0);
    });
  });

  describe('getString', () => {
    it('returns the string value', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'label', 'hello');
      expect(props.getString(1, 'label')).toBe('hello');
    });

    it('returns empty string for non-string property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'label', 42);
      expect(props.getString(1, 'label')).toBe('');
    });

    it('returns empty string for missing property', () => {
      blocks.set(1, makeBlock(1));
      expect(props.getString(1, 'missing')).toBe('');
    });
  });

  describe('getBool', () => {
    it('returns the boolean value', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'visible', true);
      expect(props.getBool(1, 'visible')).toBe(true);
    });

    it('returns false for non-boolean property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'visible', 1);
      expect(props.getBool(1, 'visible')).toBe(false);
    });

    it('returns false for missing property', () => {
      blocks.set(1, makeBlock(1));
      expect(props.getBool(1, 'missing')).toBe(false);
    });
  });

  describe('getColor', () => {
    it('returns the Color object', () => {
      blocks.set(1, makeBlock(1));
      const color: Color = { r: 0.5, g: 0.3, b: 0.1, a: 0.9 };
      props.setProperty(1, 'fill', color);
      expect(props.getColor(1, 'fill')).toEqual(color);
    });

    it('returns default black for non-color property', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'fill', 42);
      expect(props.getColor(1, 'fill')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('returns default black for missing property', () => {
      blocks.set(1, makeBlock(1));
      expect(props.getColor(1, 'missing')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
  });

  describe('findAllProperties', () => {
    it('returns keys of set properties', () => {
      blocks.set(1, makeBlock(1));
      props.setProperty(1, 'a', 1);
      props.setProperty(1, 'b', 'two');
      expect(props.findAllProperties(1).sort()).toEqual(['a', 'b']);
    });

    it('returns empty array for block with no properties', () => {
      blocks.set(1, makeBlock(1));
      expect(props.findAllProperties(1)).toEqual([]);
    });

    it('returns empty array for non-existent block', () => {
      expect(props.findAllProperties(999)).toEqual([]);
    });
  });
});
