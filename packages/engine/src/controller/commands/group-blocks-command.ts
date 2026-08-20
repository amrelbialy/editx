import type { BlockData } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import {
  absoluteToLocal,
  rotatedUnionBBox,
  type SizedTransform,
} from "../../block/group-transform";
import {
  POSITION_X,
  POSITION_Y,
  ROTATION,
  SIZE_HEIGHT,
  SIZE_WIDTH,
} from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

/**
 * Groups an existing set of blocks into ONE new group block, atomically and
 * undoably.
 *
 * - Creates a group block whose position/size is the union bounding box of the
 *   members (the group is created unrotated).
 * - Reparents each member into the group, recording its prior parent + index,
 *   and converts its coordinates into group-LOCAL space.
 * - The group is appended to the first member's parent (its new home).
 *
 * The single patch list snapshots the created group, every affected parent's
 * `children` array, and every member — so exec → undo restores byte-identical
 * pre-group state (snapshot equality) in one history entry.
 */
export class GroupBlocksCommand extends PatchCommand {
  #store: BlockStore;
  #memberIds: number[];
  #createdId: number | null = null;

  constructor(store: BlockStore, memberIds: number[]) {
    super();
    this.#store = store;
    this.#memberIds = [...memberIds];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }

  do(): Patch[] {
    const store = this.#store;
    const members = [...new Set(this.#memberIds.filter((id) => store.exists(id)))];
    if (members.length === 0 || hasHierarchyConflict(store, members)) return [];

    const groupParentId = store.getParent(members[0]);

    // Every parent whose children array is mutated (old parents + group's home).
    const affectedParents = new Set<number>();
    for (const m of members) {
      const p = store.getParent(m);
      if (p != null) affectedParents.add(p);
    }
    if (groupParentId != null) affectedParents.add(groupParentId);

    const parentBefore = new Map<number, BlockData | null>();
    for (const pid of affectedParents) parentBefore.set(pid, store.snapshot(pid));
    const memberBefore = new Map<number, BlockData | null>();
    for (const m of members) memberBefore.set(m, store.snapshot(m));

    const bbox = rotatedUnionBBox(members.map((m) => this.#readSized(m)));

    const groupId = store.create("group");
    this.#createdId = groupId;
    store.setProperty(groupId, POSITION_X, bbox.x);
    store.setProperty(groupId, POSITION_Y, bbox.y);
    store.setProperty(groupId, SIZE_WIDTH, bbox.width);
    store.setProperty(groupId, SIZE_HEIGHT, bbox.height);
    store.setProperty(groupId, ROTATION, 0);

    if (groupParentId != null) store.appendChild(groupParentId, groupId);

    const groupOrigin = { x: bbox.x, y: bbox.y, rotation: 0 };
    for (const m of members) {
      const abs = this.#readSized(m);
      const local = absoluteToLocal(abs, groupOrigin);
      store.setProperty(m, POSITION_X, local.x);
      store.setProperty(m, POSITION_Y, local.y);
      store.setProperty(m, ROTATION, local.rotation);
      // appendChild removes the member from its old parent and adopts it here.
      store.appendChild(groupId, m);
    }

    // Patch order (single history entry). The group is split into a CREATE patch
    // (empty children) and an ADOPT patch (children populated). On undo the patch
    // list is reversed + before/after swapped, so the ADOPT is reversed FIRST —
    // emptying the group's `children` array — and only then does the CREATE patch
    // destroy the now-childless group. Without this, `destroyBlock` would cascade
    // into the group's `children` and wrongly destroy the members (and their
    // sub-blocks) that undo is trying to restore to their original parent.
    const groupFull = store.snapshot(groupId) as BlockData;
    const groupEmpty: BlockData = { ...groupFull, children: [] };

    const patches: Patch[] = [{ id: groupId, before: null, after: groupEmpty }];
    for (const pid of affectedParents) {
      patches.push({ id: pid, before: parentBefore.get(pid) ?? null, after: store.snapshot(pid) });
    }
    for (const m of members) {
      patches.push({ id: m, before: memberBefore.get(m) ?? null, after: store.snapshot(m) });
    }
    patches.push({ id: groupId, before: groupEmpty, after: groupFull });
    return patches;
  }

  #readSized(id: number): SizedTransform {
    return {
      x: this.#store.getFloat(id, POSITION_X),
      y: this.#store.getFloat(id, POSITION_Y),
      rotation: this.#store.getFloat(id, ROTATION),
      width: this.#store.getFloat(id, SIZE_WIDTH),
      height: this.#store.getFloat(id, SIZE_HEIGHT),
    };
  }
}

function hasHierarchyConflict(store: BlockStore, memberIds: number[]): boolean {
  const members = new Set(memberIds);
  for (const memberId of memberIds) {
    const visited = new Set<number>();
    let parentId = store.getParent(memberId);
    while (parentId !== null) {
      if (members.has(parentId) || visited.has(parentId)) return true;
      visited.add(parentId);
      parentId = store.getParent(parentId);
    }
  }
  return false;
}
