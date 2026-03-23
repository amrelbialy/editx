import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

export class MoveChildCommand extends PatchCommand {
  #store: BlockStore;
  #parentId: number;
  #childId: number;
  #newIndex: number;

  constructor(store: BlockStore, parentId: number, childId: number, newIndex: number) {
    super();
    this.#store = store;
    this.#parentId = parentId;
    this.#childId = childId;
    this.#newIndex = newIndex;
  }

  do(): Patch[] {
    const parentBefore = this.#store.snapshot(this.#parentId);

    this.#store.moveChildToIndex(this.#parentId, this.#childId, this.#newIndex);

    const parentAfter = this.#store.snapshot(this.#parentId);

    return [{ id: String(this.#parentId), before: parentBefore, after: parentAfter }];
  }
}
