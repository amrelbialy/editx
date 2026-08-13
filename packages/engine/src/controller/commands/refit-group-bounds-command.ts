import type { BlockData } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import { rotatedUnionBBox, type SizedTransform } from "../../block/group-transform";
import {
  POSITION_X,
  POSITION_Y,
  ROTATION,
  SIZE_HEIGHT,
  SIZE_WIDTH,
} from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import type { Command } from "./commands.types";

const EPSILON = 1e-6;

class RefitGroupBoundsCommand implements Command {
  #store: BlockStore;
  #groupId: number;

  constructor(store: BlockStore, groupId: number) {
    this.#store = store;
    this.#groupId = groupId;
  }

  do(): Patch[] {
    if (this.#store.getType(this.#groupId) !== "group") return [];

    const groupIds = this.#groupChain();
    const before = new Map<number, BlockData>();
    for (const groupId of groupIds) {
      this.#capture(before, groupId);
      for (const childId of this.#store.getChildren(groupId)) this.#capture(before, childId);
      this.#refit(groupId);
    }

    const patches: Patch[] = [];
    for (const [id, snapshot] of before) {
      const after = this.#store.snapshot(id);
      if (after && !equalWithinEpsilon(snapshot, after)) {
        patches.push({ id, before: snapshot, after });
      }
    }
    return patches;
  }

  #groupChain(): number[] {
    const ids: number[] = [];
    let id: number | null = this.#groupId;
    while (id != null && this.#store.getType(id) === "group") {
      ids.push(id);
      const parentId: number | null = this.#store.getParent(id);
      id = parentId != null && this.#store.getType(parentId) === "group" ? parentId : null;
    }
    return ids;
  }

  #capture(snapshots: Map<number, BlockData>, id: number): void {
    if (snapshots.has(id)) return;
    const snapshot = this.#store.snapshot(id);
    if (snapshot) snapshots.set(id, snapshot);
  }

  #refit(groupId: number): void {
    const childIds = this.#store.getChildren(groupId);
    if (childIds.length === 0) {
      this.#setFloat(groupId, SIZE_WIDTH, 0);
      this.#setFloat(groupId, SIZE_HEIGHT, 0);
      return;
    }

    const bounds = rotatedUnionBBox(childIds.map((id) => this.#readSized(id)));
    const rotation = this.#store.getFloat(groupId, ROTATION);
    const radians = (rotation * Math.PI) / 180;
    const offsetX = bounds.x * Math.cos(radians) - bounds.y * Math.sin(radians);
    const offsetY = bounds.x * Math.sin(radians) + bounds.y * Math.cos(radians);

    this.#setFloat(groupId, POSITION_X, this.#store.getFloat(groupId, POSITION_X) + offsetX);
    this.#setFloat(groupId, POSITION_Y, this.#store.getFloat(groupId, POSITION_Y) + offsetY);
    this.#setFloat(groupId, SIZE_WIDTH, bounds.width);
    this.#setFloat(groupId, SIZE_HEIGHT, bounds.height);
    for (const childId of childIds) {
      this.#setFloat(childId, POSITION_X, this.#store.getFloat(childId, POSITION_X) - bounds.x);
      this.#setFloat(childId, POSITION_Y, this.#store.getFloat(childId, POSITION_Y) - bounds.y);
    }
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

  #setFloat(id: number, key: string, value: number): void {
    if (Math.abs(this.#store.getFloat(id, key) - value) > EPSILON) {
      this.#store.setProperty(id, key, value);
    }
  }
}

export function createRefitGroupBoundsCommand(store: BlockStore, groupId: number): Command {
  return new RefitGroupBoundsCommand(store, groupId);
}

function equalWithinEpsilon(left: unknown, right: unknown): boolean {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) <= EPSILON;
  }
  if (left === right) return true;
  if (left == null || right == null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) => rightKeys.includes(key) && equalWithinEpsilon(leftRecord[key], rightRecord[key]),
    )
  );
}
