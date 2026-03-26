import type { BlockData } from "./block/block.types";

export interface Patch {
  id: number;
  before: BlockData | null;
  after: BlockData | null;
}

export class HistoryManager {
  #stack: Patch[][] = [];
  #index = -1;

  push(patches: Patch[]) {
    // Remove redo history if new action is triggered
    this.#stack = this.#stack.slice(0, this.#index + 1);

    this.#stack.push(patches);
    this.#index++;
  }

  undo(): Patch[] | null {
    if (!this.canUndo()) return null;

    const patches = this.#stack[this.#index];
    this.#index--;

    // Return patches *in reverse order*, so undo applies them correctly
    return patches
      .map((p) => ({
        id: p.id,
        before: p.after,
        after: p.before,
      }))
      .reverse();
  }

  redo(): Patch[] | null {
    if (!this.canRedo()) return null;

    this.#index++;
    const patches = this.#stack[this.#index];

    // redo applies normally (after)
    return patches;
  }

  canUndo() {
    return this.#index >= 0;
  }

  canRedo() {
    return this.#index < this.#stack.length - 1;
  }

  clear() {
    this.#stack = [];
    this.#index = -1;
  }
}
