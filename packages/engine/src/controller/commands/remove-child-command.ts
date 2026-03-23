import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

export class RemoveChildCommand extends PatchCommand {
  #store: BlockStore;
  #parentId: number;
  #childId: number;

  constructor(store: BlockStore, parentId: number, childId: number) {
    super();
    this.#store = store;
    this.#parentId = parentId;
    this.#childId = childId;
  }

  do(): Patch[] {
    const parentBefore = this.#store.snapshot(this.#parentId);
    const childBefore = this.#store.snapshot(this.#childId);

    this.#store.removeChild(this.#parentId, this.#childId);

    const parentAfter = this.#store.snapshot(this.#parentId);
    const childAfter = this.#store.snapshot(this.#childId);

    return [
      { id: String(this.#parentId), before: parentBefore, after: parentAfter },
      { id: String(this.#childId), before: childBefore, after: childAfter },
    ];
  }
}
