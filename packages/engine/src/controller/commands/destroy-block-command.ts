import { BlockStore } from '../../block/block-store';
import { BlockData } from '../../block/block.types';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class DestroyBlockCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;

  constructor(store: BlockStore, blockId: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
  }

  do(): Patch[] {
    const patches: Patch[] = [];
    this.#collectSnapshots(this.#blockId, patches);
    this.#store.destroy(this.#blockId);
    return patches;
  }

  /** Recursively snapshot the block and all its sub-blocks / children before destroy. */
  #collectSnapshots(id: number, patches: Patch[]): void {
    const block = this.#store.get(id);
    if (!block) return;

    patches.push({ id: String(id), before: this.#store.snapshot(id), after: null });

    // Sub-blocks
    if (block.shapeId != null) this.#collectSnapshots(block.shapeId, patches);
    if (block.fillId != null) this.#collectSnapshots(block.fillId, patches);
    for (const effectId of block.effectIds) this.#collectSnapshots(effectId, patches);

    // Children
    for (const childId of block.children) this.#collectSnapshots(childId, patches);
  }
}
