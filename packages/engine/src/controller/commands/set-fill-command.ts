import { BlockStore } from '../../block/block-store';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class SetFillCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #fillId: number;

  constructor(store: BlockStore, blockId: number, fillId: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#fillId = fillId;
  }

  do(): Patch[] {
    const blockBefore = this.#store.snapshot(this.#blockId);

    this.#store.setFill(this.#blockId, this.#fillId);

    const blockAfter = this.#store.snapshot(this.#blockId);

    return [
      { id: String(this.#blockId), before: blockBefore, after: blockAfter },
    ];
  }
}
