import { BlockStore } from '../../block/block-store';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class AppendEffectCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #effectId: number;

  constructor(store: BlockStore, blockId: number, effectId: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#effectId = effectId;
  }

  do(): Patch[] {
    const blockBefore = this.#store.snapshot(this.#blockId);

    this.#store.appendEffect(this.#blockId, this.#effectId);

    const blockAfter = this.#store.snapshot(this.#blockId);

    return [
      { id: String(this.#blockId), before: blockBefore, after: blockAfter },
    ];
  }
}
