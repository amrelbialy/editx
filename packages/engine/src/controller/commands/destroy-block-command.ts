import { BlockStore } from '../../block/block-store';
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
    const before = this.#store.snapshot(this.#blockId);
    this.#store.destroy(this.#blockId);
    return [
      {
        id: String(this.#blockId),
        before,
        after: null,
      },
    ];
  }
}
