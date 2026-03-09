import { BlockStore } from '../../block/block-store';
import { EffectType } from '../../block/block.types';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class CreateEffectCommand extends PatchCommand {
  #store: BlockStore;
  #effectType: EffectType;
  #createdId: number | null = null;

  constructor(store: BlockStore, effectType: EffectType) {
    super();
    this.#store = store;
    this.#effectType = effectType;
  }

  do(): Patch[] {
    const id = this.#store.createEffect(this.#effectType);
    this.#createdId = id;
    return [
      {
        id: String(id),
        before: null,
        after: this.#store.snapshot(id),
      },
    ];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }
}
