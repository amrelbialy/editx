import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

export class SetKindCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #kind: string;

  constructor(store: BlockStore, blockId: number, kind: string) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#kind = kind;
  }

  do(): Patch[] {
    const before = this.#store.snapshot(this.#blockId);
    this.#store.setKind(this.#blockId, this.#kind);
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
