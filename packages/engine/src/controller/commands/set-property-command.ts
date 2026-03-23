import type { PropertyValue } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

export class SetPropertyCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #key: string;
  #value: PropertyValue;

  constructor(store: BlockStore, blockId: number, key: string, value: PropertyValue) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#key = key;
    this.#value = value;
  }

  do(): Patch[] {
    const before = this.#store.snapshot(this.#blockId);
    this.#store.setProperty(this.#blockId, this.#key, this.#value);
    const after = this.#store.snapshot(this.#blockId);
    return [
      {
        id: String(this.#blockId),
        before,
        after,
      },
    ];
  }
}
