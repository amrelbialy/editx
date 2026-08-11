import type { BlockData } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import { localToAbsolute, type Transform2D } from "../../block/group-transform";
import { POSITION_X, POSITION_Y, ROTATION } from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import { PatchCommand } from "./patch-command";

/**
 * Dissolves a group block, restoring every member to the group's parent at the
 * group's original slot (preserving z-order), with its ABSOLUTE transform
 * (the group's transform composed onto the member's local transform), then
 * destroys the now-empty group. One atomic, undoable command.
 */
export class UngroupBlocksCommand extends PatchCommand {
  #store: BlockStore;
  #groupId: number;
  #freedIds: number[] = [];

  constructor(store: BlockStore, groupId: number) {
    super();
    this.#store = store;
    this.#groupId = groupId;
  }

  /** Member ids freed by the ungroup (valid after `do()`). */
  getFreedIds(): number[] {
    return [...this.#freedIds];
  }

  do(): Patch[] {
    const store = this.#store;
    const groupId = this.#groupId;
    if (store.getType(groupId) !== "group") return [];

    const members = store.getChildren(groupId);
    this.#freedIds = [...members];
    const groupParentId = store.getParent(groupId);
    const groupTransform: Transform2D = {
      x: store.getFloat(groupId, POSITION_X),
      y: store.getFloat(groupId, POSITION_Y),
      rotation: store.getFloat(groupId, ROTATION),
    };
    const groupIndex =
      groupParentId != null ? store.getChildren(groupParentId).indexOf(groupId) : -1;

    // Before snapshots (group + its parent + every member).
    const groupBefore = store.snapshot(groupId);
    const parentBefore = groupParentId != null ? store.snapshot(groupParentId) : null;
    const memberBefore = new Map<number, BlockData | null>();
    for (const m of members) memberBefore.set(m, store.snapshot(m));

    members.forEach((m, i) => {
      const abs = localToAbsolute(
        {
          x: store.getFloat(m, POSITION_X),
          y: store.getFloat(m, POSITION_Y),
          rotation: store.getFloat(m, ROTATION),
        },
        groupTransform,
      );
      store.setProperty(m, POSITION_X, abs.x);
      store.setProperty(m, POSITION_Y, abs.y);
      store.setProperty(m, ROTATION, abs.rotation);
      if (groupParentId != null) {
        store.appendChild(groupParentId, m);
        store.moveChildToIndex(groupParentId, m, groupIndex + i);
      } else {
        store.removeChild(groupId, m);
      }
    });

    // Group is now childless — safe to destroy without cascading into members.
    store.destroy(groupId);

    // Patch order (single history entry). Mirror of GroupBlocksCommand: the group
    // is split into a RELEASE patch (children → empty) and a DESTROY patch. On
    // redo the RELEASE runs first (emptying `children`) so the DESTROY cannot
    // cascade into the members; on undo the DESTROY is reversed first (re-creating
    // the childless group) and the RELEASE restores its children last.
    const groupEmpty: BlockData = { ...(groupBefore as BlockData), children: [] };
    const patches: Patch[] = [
      { id: groupId, before: groupBefore, after: groupEmpty },
      { id: groupId, before: groupEmpty, after: null },
    ];
    if (groupParentId != null) {
      patches.push({
        id: groupParentId,
        before: parentBefore,
        after: store.snapshot(groupParentId),
      });
    }
    for (const m of members) {
      patches.push({ id: m, before: memberBefore.get(m) ?? null, after: store.snapshot(m) });
    }
    return patches;
  }
}
