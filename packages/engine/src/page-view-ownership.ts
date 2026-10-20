import type { BlockData } from "./block/block.types";

type BlockLookup = {
  get(id: number): BlockData | undefined;
};

/** Resolve the direct or ancestral page containing a rendered/document block. */
export function getOwningPageId(store: BlockLookup, blockId: number): number | null {
  let currentId: number | null = blockId;
  let remaining = 10_000;
  while (currentId !== null && remaining-- > 0) {
    const block = store.get(currentId);
    if (!block) return null;
    if (block.type === "page") return block.id;
    currentId = block.parentId;
  }
  return null;
}
