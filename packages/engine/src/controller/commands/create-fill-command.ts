import type { FillType } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class CreateFillCommand extends PatchCommand {
  #store: BlockStore;
  #fillType: FillType;
  #createdId: number | null = null;

  constructor(store: BlockStore, fillType: FillType) {
    super();
    this.#store = store;
    this.#fillType = fillType;
  }

  do(): Patch[] {
    const id = this.#store.createFill(this.#fillType);
    this.#createdId = id;
    return [
      {
        id: id,
        before: null,
        after: this.#store.snapshot(id),
      },
    ];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }
}
