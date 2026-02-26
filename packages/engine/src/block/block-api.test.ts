import { describe, it, expect, beforeEach } from 'vitest';
import { BlockAPI } from './block-api';
import { Engine } from '../engine';
import { POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, OPACITY, VISIBLE, FILL_COLOR } from './property-keys';
import type { Color } from './block.types';

describe('BlockAPI', () => {
  let engine: Engine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new Engine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  describe('create / destroy', () => {
    it('creates a block and returns its id', () => {
      const id = block.create('graphic');
      expect(id).toBeDefined();
      expect(block.exists(id)).toBe(true);
    });

    it('destroys a block', () => {
      const id = block.create('graphic');
      block.destroy(id);
      expect(block.exists(id)).toBe(false);
    });

    it('create is undoable', () => {
      const id = block.create('graphic');
      engine.undo();
      expect(block.exists(id)).toBe(false);
    });

    it('destroy is undoable', () => {
      const id = block.create('graphic');
      block.destroy(id);
      engine.undo();
      expect(block.exists(id)).toBe(true);
    });
  });

  describe('type / kind', () => {
    it('getType returns the block type', () => {
      const id = block.create('text');
      expect(block.getType(id)).toBe('text');
    });

    it('setKind / getKind', () => {
      const id = block.create('graphic');
      block.setKind(id, 'rectangle');
      expect(block.getKind(id)).toBe('rectangle');
    });

    it('setKind is undoable', () => {
      const id = block.create('graphic');
      block.setKind(id, 'circle');
      engine.undo();
      expect(block.getKind(id)).toBe('');
    });
  });

  describe('hierarchy', () => {
    it('appendChild / getChildren / getParent', () => {
      const parent = block.create('page');
      const child = block.create('graphic');
      block.appendChild(parent, child);
      expect(block.getChildren(parent)).toContain(child);
      expect(block.getParent(child)).toBe(parent);
    });

    it('removeChild', () => {
      const parent = block.create('page');
      const child = block.create('graphic');
      block.appendChild(parent, child);
      block.removeChild(parent, child);
      expect(block.getChildren(parent)).not.toContain(child);
      expect(block.getParent(child)).toBeNull();
    });

    it('appendChild is undoable', () => {
      const parent = block.create('page');
      const child = block.create('graphic');
      block.appendChild(parent, child);
      engine.undo();
      expect(block.getChildren(parent)).not.toContain(child);
    });
  });

  describe('property getters', () => {
    it('getFloat returns default', () => {
      const id = block.create('graphic');
      expect(block.getFloat(id, POSITION_X)).toBe(0);
    });

    it('getString returns default', () => {
      const id = block.create('text');
      expect(block.getString(id, 'text/content')).toBe('Text');
    });

    it('getBool returns default', () => {
      const id = block.create('graphic');
      expect(block.getBool(id, VISIBLE)).toBe(true);
    });

    it('getColor returns default', () => {
      const id = block.create('page');
      const color = block.getColor(id, FILL_COLOR);
      expect(color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });
  });

  describe('property setters', () => {
    it('setFloat changes value', () => {
      const id = block.create('graphic');
      block.setFloat(id, POSITION_X, 42);
      expect(block.getFloat(id, POSITION_X)).toBe(42);
    });

    it('setString changes value', () => {
      const id = block.create('text');
      block.setString(id, 'text/content', 'Hello');
      expect(block.getString(id, 'text/content')).toBe('Hello');
    });

    it('setBool changes value', () => {
      const id = block.create('graphic');
      block.setBool(id, VISIBLE, false);
      expect(block.getBool(id, VISIBLE)).toBe(false);
    });

    it('setColor changes value', () => {
      const id = block.create('graphic');
      const red: Color = { r: 1, g: 0, b: 0, a: 1 };
      block.setColor(id, FILL_COLOR, red);
      expect(block.getColor(id, FILL_COLOR)).toEqual(red);
    });

    it('setProperty is undoable', () => {
      const id = block.create('graphic');
      block.setFloat(id, POSITION_X, 100);
      engine.undo();
      expect(block.getFloat(id, POSITION_X)).toBe(0);
    });
  });

  describe('convenience setters', () => {
    it('setPosition sets x and y', () => {
      const id = block.create('graphic');
      block.setPosition(id, 10, 20);
      expect(block.getFloat(id, POSITION_X)).toBe(10);
      expect(block.getFloat(id, POSITION_Y)).toBe(20);
    });

    it('setPosition is a single undo step', () => {
      const id = block.create('graphic');
      block.setPosition(id, 10, 20);
      engine.undo();
      expect(block.getFloat(id, POSITION_X)).toBe(0);
      expect(block.getFloat(id, POSITION_Y)).toBe(0);
    });

    it('setSize sets width and height', () => {
      const id = block.create('graphic');
      block.setSize(id, 200, 300);
      expect(block.getFloat(id, SIZE_WIDTH)).toBe(200);
      expect(block.getFloat(id, SIZE_HEIGHT)).toBe(300);
    });

    it('setSize is a single undo step', () => {
      const id = block.create('graphic');
      block.setSize(id, 200, 300);
      engine.undo();
      expect(block.getFloat(id, SIZE_WIDTH)).toBe(100); // default
      expect(block.getFloat(id, SIZE_HEIGHT)).toBe(100);
    });

    it('setRotation changes rotation', () => {
      const id = block.create('graphic');
      block.setRotation(id, 45);
      expect(block.getFloat(id, 'transform/rotation')).toBe(45);
    });

    it('setOpacity changes opacity', () => {
      const id = block.create('graphic');
      block.setOpacity(id, 0.5);
      expect(block.getFloat(id, OPACITY)).toBe(0.5);
    });

    it('setVisible changes visibility', () => {
      const id = block.create('graphic');
      block.setVisible(id, false);
      expect(block.getBool(id, VISIBLE)).toBe(false);
    });
  });

  describe('query', () => {
    it('findByType returns matching blocks', () => {
      const id1 = block.create('graphic');
      const id2 = block.create('graphic');
      block.create('text');
      expect(block.findByType('graphic')).toEqual(expect.arrayContaining([id1, id2]));
    });

    it('findByKind returns matching blocks', () => {
      const id = block.create('graphic');
      block.setKind(id, 'circle');
      expect(block.findByKind('circle')).toContain(id);
    });

    it('getPropertyKeys returns keys', () => {
      const id = block.create('graphic');
      const keys = block.getPropertyKeys(id);
      expect(keys).toContain(POSITION_X);
    });
  });
});
