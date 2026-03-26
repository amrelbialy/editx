import type { BlockData, BlockType, PropertyValue } from "./block.types";
import type { BlockHierarchy } from "./block-hierarchy";

/** Create a BlockData record with all standard fields. */
export function createBlockData(
  id: number,
  type: BlockType,
  kind: string,
  name: string,
  defaults: Record<string, PropertyValue>,
): BlockData {
  return {
    id,
    type,
    kind,
    name,
    parentId: null,
    children: [],
    effectIds: [],
    shapeId: null,
    fillId: null,
    properties: defaults,
  };
}

/** Detach and recursively destroy a block and all its sub-blocks/children. */
export function destroyBlock(
  blocks: Map<number, BlockData>,
  hierarchy: BlockHierarchy,
  id: number,
  recurse: (childId: number) => void,
): void {
  const block = blocks.get(id);
  if (!block) return;

  hierarchy.unparent(id);

  if (block.type === "effect") {
    for (const [, b] of blocks) {
      const idx = b.effectIds.indexOf(id);
      if (idx !== -1) {
        b.effectIds.splice(idx, 1);
        break;
      }
    }
  }
  if (block.type === "shape") {
    for (const [, b] of blocks) {
      if (b.shapeId === id) {
        b.shapeId = null;
        break;
      }
    }
  }
  if (block.type === "fill") {
    for (const [, b] of blocks) {
      if (b.fillId === id) {
        b.fillId = null;
        break;
      }
    }
  }

  for (const effectId of [...block.effectIds]) recurse(effectId);
  if (block.shapeId != null) recurse(block.shapeId);
  if (block.fillId != null) recurse(block.fillId);
  for (const childId of [...block.children]) recurse(childId);

  blocks.delete(id);
}
