import type { BlockData } from './block.types';

/**
 * Manages parent/child relationships between blocks.
 * Operates on the shared blocks Map owned by BlockStore.
 */
export class BlockHierarchy {
  #blocks: Map<number, BlockData>;

  constructor(blocks: Map<number, BlockData>) {
    this.#blocks = blocks;
  }

  appendChild(parentId: number, childId: number): void {
    const parent = this.#blocks.get(parentId);
    const child = this.#blocks.get(childId);
    if (!parent || !child) return;

    // Remove from old parent if any
    if (child.parentId !== null && child.parentId !== parentId) {
      const oldParent = this.#blocks.get(child.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter((c) => c !== childId);
      }
    }

    child.parentId = parentId;
    if (!parent.children.includes(childId)) {
      parent.children.push(childId);
    }
  }

  removeChild(parentId: number, childId: number): void {
    const parent = this.#blocks.get(parentId);
    const child = this.#blocks.get(childId);
    if (!parent || !child) return;

    parent.children = parent.children.filter((c) => c !== childId);
    if (child.parentId === parentId) {
      child.parentId = null;
    }
  }

  getChildren(id: number): number[] {
    return this.#blocks.get(id)?.children.slice() ?? [];
  }

  getParent(id: number): number | null {
    return this.#blocks.get(id)?.parentId ?? null;
  }

  /** Move a child to a specific index within its parent's children array. */
  moveChildToIndex(parentId: number, childId: number, newIndex: number): void {
    const parent = this.#blocks.get(parentId);
    if (!parent) return;

    const currentIndex = parent.children.indexOf(childId);
    if (currentIndex === -1) return;

    parent.children.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, parent.children.length));
    parent.children.splice(clampedIndex, 0, childId);
  }

  /** Unparent a block from its parent (used by destroy). */
  unparent(id: number): void {
    const block = this.#blocks.get(id);
    if (!block || block.parentId === null) return;
    const parent = this.#blocks.get(block.parentId);
    if (parent) {
      parent.children = parent.children.filter((c) => c !== id);
    }
    block.parentId = null;
  }
}
