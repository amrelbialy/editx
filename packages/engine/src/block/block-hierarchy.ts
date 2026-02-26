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
