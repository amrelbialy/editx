import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

export class RemoveEffectCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #index: number;
  #removedEffectId: number | null = null;

  constructor(store: BlockStore, blockId: number, index: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#index = index;
  }

  do(): Patch[] {
    const blockBefore = this.#store.snapshot(this.#blockId);

    this.#removedEffectId = this.#store.removeEffect(this.#blockId, this.#index);

    const blockAfter = this.#store.snapshot(this.#blockId);

    return [{ id: String(this.#blockId), before: blockBefore, after: blockAfter }];
  }

  getRemovedEffectId(): number | null {
    return this.#removedEffectId;
  }
}
