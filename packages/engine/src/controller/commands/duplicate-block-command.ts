import type { BlockData } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import { POSITION_X, POSITION_Y } from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

export class DuplicateBlockCommand extends PatchCommand {
  #createdId: number | null = null;

  constructor(
    private readonly store: BlockStore,
    private readonly blockId: number,
    private readonly positionOffset = 0,
    private readonly insertionIndex?: number,
  ) {
    super();
  }

  do(): Patch[] {
    const parentId = this.store.getParent(this.blockId);
    if (parentId === null) throw new Error(`Block ${this.blockId} has no parent`);
    const parentBefore = this.store.snapshot(parentId);
    if (!parentBefore?.children.includes(this.blockId)) {
      throw new Error(`Block ${this.blockId} is not a child of ${parentId}`);
    }
    const snapshots = this.#snapshotTree();
    for (const block of snapshots.values()) {
      if (block.id !== this.blockId && block.parentId !== null && !snapshots.has(block.parentId)) {
        throw new Error(`Block ${block.id} has a parent outside the duplicated tree`);
      }
    }

    const ids = new Map<number, number>();
    for (const block of snapshots.values()) {
      ids.set(block.id, this.store.create(block.type, block.kind));
    }
    const remap = (id: number): number => ids.get(id)!;
    for (const block of snapshots.values()) {
      this.store.restore({
        ...block,
        id: remap(block.id),
        parentId:
          block.id === this.blockId || block.parentId === null ? null : remap(block.parentId),
        children: block.children.map(remap),
        shapeId: block.shapeId === null ? null : remap(block.shapeId),
        fillId: block.fillId === null ? null : remap(block.fillId),
        effectIds: block.effectIds.map(remap),
      });
    }
    const createdId = remap(this.blockId);
    if (this.positionOffset !== 0) {
      for (const key of [POSITION_X, POSITION_Y]) {
        this.store.setProperty(
          createdId,
          key,
          this.store.getFloat(createdId, key) + this.positionOffset,
        );
      }
    }
    this.store.appendChild(parentId, createdId);
    if (this.insertionIndex !== undefined) {
      this.store.moveChildToIndex(parentId, createdId, this.insertionIndex);
    }
    this.#createdId = createdId;

    return [
      { id: parentId, before: parentBefore, after: this.store.snapshot(parentId) },
      ...[...ids.values()].map((id) => ({
        id,
        before: null,
        after: this.store.snapshot(id),
      })),
    ];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }

  #snapshotTree(): Map<number, BlockData> {
    const snapshots = new Map<number, BlockData>();
    const visiting = new Set<number>();
    const visit = (id: number): void => {
      if (visiting.has(id)) throw new Error(`Cannot duplicate cyclic block graph at ${id}`);
      if (snapshots.has(id)) return;
      const block = this.store.snapshot(id);
      if (!block) throw new Error(`Block ${id} not found`);
      visiting.add(id);
      snapshots.set(id, block);
      if (block.shapeId !== null) visit(block.shapeId);
      if (block.fillId !== null) visit(block.fillId);
      for (const effectId of block.effectIds) visit(effectId);
      for (const childId of block.children) {
        if (this.store.getParent(childId) !== id) {
          throw new Error(`Block ${childId} is not a child of ${id}`);
        }
        visit(childId);
      }
      visiting.delete(id);
    };
    visit(this.blockId);
    return snapshots;
  }
}
