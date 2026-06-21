import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class AppendChildCommand extends PatchCommand {
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
    // When the child already belongs to a different parent, appendChild() also
    // mutates that old parent's children array. Snapshot it so the reparent is
    // fully reversible (otherwise undo never returns the child to its origin).
    const oldParentId = this.#store.getParent(this.#childId);
    const isReparent = oldParentId != null && oldParentId !== this.#parentId;

    const parentBefore = this.#store.snapshot(this.#parentId);
    const childBefore = this.#store.snapshot(this.#childId);
    const oldParentBefore = isReparent ? this.#store.snapshot(oldParentId) : null;

    this.#store.appendChild(this.#parentId, this.#childId);

    const parentAfter = this.#store.snapshot(this.#parentId);
    const childAfter = this.#store.snapshot(this.#childId);

    const patches: Patch[] = [
      { id: this.#parentId, before: parentBefore, after: parentAfter },
      { id: this.#childId, before: childBefore, after: childAfter },
    ];

    if (isReparent && oldParentId != null) {
      patches.push({
        id: oldParentId,
        before: oldParentBefore,
        after: this.#store.snapshot(oldParentId),
      });
    }

    return patches;
  }
}
