import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class DestroyBlockCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;

  constructor(store: BlockStore, blockId: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
  }

  do(): Patch[] {
    const patches: Patch[] = [];

    // 1. Snapshot blocks whose references will be mutated (parent / sub-block owner).
    //    These go first so on undo (reversed) they're restored LAST, after destroyed blocks.
    const ownerPatchCount = this.#snapshotAffectedOwners(patches);

    // 2. Snapshot the block and all its sub-blocks / children being destroyed.
    this.#collectSnapshots(this.#blockId, patches);

    // 3. Execute the destruction.
    this.#store.destroy(this.#blockId);

    // 4. Capture "after" state of owner/parent blocks (post-destroy).
    for (let i = 0; i < ownerPatchCount; i++) {
      patches[i].after = this.#store.snapshot(patches[i].id);
    }

    return patches;
  }

  /** Snapshot parent and/or sub-block owner whose arrays are mutated by destroy. */
  #snapshotAffectedOwners(patches: Patch[]): number {
    const block = this.#store.get(this.#blockId);
    if (!block) return 0;

    const snapshotted = new Set<number>();

    const parentId = this.#store.getParent(this.#blockId);
    if (parentId != null) {
      patches.push({ id: parentId, before: this.#store.snapshot(parentId), after: null });
      snapshotted.add(parentId);
    }

    if (block.type === "effect" || block.type === "shape" || block.type === "fill") {
      const ownerId = this.#store.findSubBlockOwner(this.#blockId);
      if (ownerId != null && !snapshotted.has(ownerId)) {
        patches.push({ id: ownerId, before: this.#store.snapshot(ownerId), after: null });
        snapshotted.add(ownerId);
      }
    }

    return snapshotted.size;
  }

  /** Recursively snapshot the block and all its sub-blocks / children before destroy. */
  #collectSnapshots(id: number, patches: Patch[]): void {
    const block = this.#store.get(id);
    if (!block) return;

    patches.push({ id: id, before: this.#store.snapshot(id), after: null });

    // Sub-blocks
    if (block.shapeId != null) this.#collectSnapshots(block.shapeId, patches);
    if (block.fillId != null) this.#collectSnapshots(block.fillId, patches);
    for (const effectId of block.effectIds) this.#collectSnapshots(effectId, patches);

    // Children
    for (const childId of block.children) this.#collectSnapshots(childId, patches);
  }
}
