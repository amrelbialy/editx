import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class InsertEffectCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #effectId: number;
  #index: number;

  constructor(store: BlockStore, blockId: number, effectId: number, index: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#effectId = effectId;
    this.#index = index;
  }

  do(): Patch[] {
    const blockBefore = this.#store.snapshot(this.#blockId);

    this.#store.insertEffect(this.#blockId, this.#effectId, this.#index);

    const blockAfter = this.#store.snapshot(this.#blockId);

    return [{ id: this.#blockId, before: blockBefore, after: blockAfter }];
  }
}
