import { AppendChildCommand } from "../controller/commands/append-child-command";
import { GroupBlocksCommand } from "../controller/commands/group-blocks-command";
import { createRefitGroupBoundsCommand } from "../controller/commands/refit-group-bounds-command";
import { RemoveChildCommand } from "../controller/commands/remove-child-command";
import { SetPropertyCommand } from "../controller/commands/set-property-command";
import { UngroupBlocksCommand } from "../controller/commands/ungroup-blocks-command";
import type { EngineCore } from "../engine-core";
import type { BlockStore } from "./block-store";
import { absoluteToLocal, localToAbsolute, type Transform2D } from "./group-transform";
import { POSITION_X, POSITION_Y, ROTATION } from "./property-keys";

/**
 * Group mutation API: create/dissolve groups and move blocks in/out of them.
 * All four operations are undoable document mutations routed through commands.
 * Group-context (enter/exit) navigation state lives on the selection API.
 */
export class BlockGroupAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  /** Group blocks into one new group; returns the created group id. */
  group(ids: number[]): number {
    const store = this.#engine._getBlockStore();
    const cmd = new GroupBlocksCommand(store, ids);
    this.#engine.exec(cmd);
    const id = cmd.getCreatedId();
    if (id == null) throw new Error("group(): no group was created");
    return id;
  }

  /** Dissolve a group; returns the freed member ids. */
  ungroup(groupId: number): number[] {
    const store = this.#engine._getBlockStore();
    const cmd = new UngroupBlocksCommand(store, groupId);
    this.#engine.exec(cmd);
    return cmd.getFreedIds();
  }

  /** Refit a group's logical bounds and all group ancestors in one undo step. */
  refitGroupBounds(groupId: number): void {
    const store = this.#engine._getBlockStore();
    this.#engine.exec(createRefitGroupBoundsCommand(store, groupId));
  }

  /** Reparent a block into a group, converting its coords to group-local. */
  addToGroup(groupId: number, blockId: number): void {
    const store = this.#engine._getBlockStore();
    if (store.getType(groupId) !== "group") return;
    const blockAbs = absoluteTransformOf(store, blockId);
    const groupAbs = absoluteTransformOf(store, groupId);
    const local = absoluteToLocal(blockAbs, groupAbs);
    this.#reparent(store, groupId, blockId, local);
  }

  /** Reparent a block out to the group's parent, restoring its absolute coords. */
  removeFromGroup(groupId: number, blockId: number): void {
    const store = this.#engine._getBlockStore();
    if (store.getParent(blockId) !== groupId) return;
    const targetParent = store.getParent(groupId);
    const blockAbs = absoluteTransformOf(store, blockId);
    const targetAbs =
      targetParent != null ? absoluteTransformOf(store, targetParent) : { x: 0, y: 0, rotation: 0 };
    const local = absoluteToLocal(blockAbs, targetAbs);
    this.#reparent(store, targetParent, blockId, local);
  }

  /** Set new local coords then reparent (or unparent), in one undoable batch. */
  #reparent(store: BlockStore, parentId: number | null, blockId: number, local: Transform2D): void {
    this.#engine.beginBatch();
    this.#engine.exec(new SetPropertyCommand(store, blockId, POSITION_X, local.x));
    this.#engine.exec(new SetPropertyCommand(store, blockId, POSITION_Y, local.y));
    this.#engine.exec(new SetPropertyCommand(store, blockId, ROTATION, local.rotation));
    const currentParent = store.getParent(blockId);
    if (parentId != null) {
      this.#engine.exec(new AppendChildCommand(store, parentId, blockId));
    } else if (currentParent != null) {
      this.#engine.exec(new RemoveChildCommand(store, currentParent, blockId));
    }
    this.#engine.endBatch();
  }
}

/**
 * Absolute (world) transform of a block, composing local→absolute up through any
 * GROUP ancestors. Stops at the first non-group parent (page/world = identity),
 * which is exactly where the renderer roots top-level nodes.
 */
export function absoluteTransformOf(store: BlockStore, id: number): Transform2D {
  let acc: Transform2D = readTransform(store, id);
  let parentId = store.getParent(id);
  while (parentId != null && store.getType(parentId) === "group") {
    acc = localToAbsolute(acc, readTransform(store, parentId));
    parentId = store.getParent(parentId);
  }
  return acc;
}

function readTransform(store: BlockStore, id: number): Transform2D {
  return {
    x: store.getFloat(id, POSITION_X),
    y: store.getFloat(id, POSITION_Y),
    rotation: store.getFloat(id, ROTATION),
  };
}
