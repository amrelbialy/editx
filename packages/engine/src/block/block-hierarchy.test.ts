import { describe, it, expect, beforeEach } from 'vitest';
import { BlockHierarchy } from './block-hierarchy';
import type { BlockData } from './block.types';

function makeBlock(id: number): BlockData {
  return {
    id,
    type: 'graphic',
    kind: '',
    name: `block-${id}`,
    parentId: null,
    children: [],
    properties: {},
  };
}

describe('BlockHierarchy', () => {
  let blocks: Map<number, BlockData>;
  let hierarchy: BlockHierarchy;

  beforeEach(() => {
    blocks = new Map();
    hierarchy = new BlockHierarchy(blocks);
  });

  describe('appendChild', () => {
    it('adds child to parent and sets parentId', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);

      expect(parent.children).toEqual([2]);
      expect(child.parentId).toBe(1);
    });

    it('does not duplicate if child already appended', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);
      hierarchy.appendChild(1, 2);

      expect(parent.children).toEqual([2]);
    });

    it('does nothing if parent does not exist', () => {
      const child = makeBlock(2);
      blocks.set(2, child);

      hierarchy.appendChild(999, 2);
      expect(child.parentId).toBeNull();
    });

    it('does nothing if child does not exist', () => {
      const parent = makeBlock(1);
      blocks.set(1, parent);

      hierarchy.appendChild(1, 999);
      expect(parent.children).toEqual([]);
    });

    it('auto-removes child from old parent on re-parent', () => {
      const oldParent = makeBlock(1);
      const newParent = makeBlock(2);
      const child = makeBlock(3);
      blocks.set(1, oldParent);
      blocks.set(2, newParent);
      blocks.set(3, child);

      hierarchy.appendChild(1, 3);
      expect(oldParent.children).toEqual([3]);
      expect(child.parentId).toBe(1);

      hierarchy.appendChild(2, 3);
      expect(oldParent.children).toEqual([]);
      expect(newParent.children).toEqual([3]);
      expect(child.parentId).toBe(2);
    });
  });

  describe('removeChild', () => {
    it('removes child from parent and clears parentId', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);
      hierarchy.removeChild(1, 2);

      expect(parent.children).toEqual([]);
      expect(child.parentId).toBeNull();
    });

    it('does nothing if parent does not exist', () => {
      const child = makeBlock(2);
      child.parentId = 999;
      blocks.set(2, child);

      hierarchy.removeChild(999, 2);
      expect(child.parentId).toBe(999);
    });
  });

  describe('getChildren', () => {
    it('returns a copy of the children array', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);
      const children = hierarchy.getChildren(1);

      expect(children).toEqual([2]);
      // Must be a copy, not the original
      children.push(999);
      expect(hierarchy.getChildren(1)).toEqual([2]);
    });

    it('returns empty array for non-existent block', () => {
      expect(hierarchy.getChildren(999)).toEqual([]);
    });
  });

  describe('getParent', () => {
    it('returns parent id', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);
      expect(hierarchy.getParent(2)).toBe(1);
    });

    it('returns null for unparented block', () => {
      blocks.set(1, makeBlock(1));
      expect(hierarchy.getParent(1)).toBeNull();
    });

    it('returns null for non-existent block', () => {
      expect(hierarchy.getParent(999)).toBeNull();
    });
  });

  describe('unparent', () => {
    it('removes block from its parent', () => {
      const parent = makeBlock(1);
      const child = makeBlock(2);
      blocks.set(1, parent);
      blocks.set(2, child);

      hierarchy.appendChild(1, 2);
      hierarchy.unparent(2);

      expect(parent.children).toEqual([]);
      expect(child.parentId).toBeNull();
    });

    it('does nothing if block has no parent', () => {
      const block = makeBlock(1);
      blocks.set(1, block);

      hierarchy.unparent(1);
      expect(block.parentId).toBeNull();
    });

    it('does nothing for non-existent block', () => {
      // Should not throw
      hierarchy.unparent(999);
    });
  });
});
