import type { BlockData, Color, PropertyValue } from './block.types';

/**
 * Creates deep-copy snapshots of blocks for undo/redo.
 * Operates on the shared blocks Map owned by BlockStore.
 */
export class BlockSnapshot {
  #blocks: Map<number, BlockData>;

  constructor(blocks: Map<number, BlockData>) {
    this.#blocks = blocks;
  }

  snapshot(id: number): BlockData | null {
    const block = this.#blocks.get(id);
    if (!block) return null;

    return {
      ...block,
      children: [...block.children],
      effectIds: [...block.effectIds],
      properties: deepCopyProperties(block.properties),
    };
  }

  restore(data: BlockData): void {
    this.#blocks.set(data.id, {
      ...data,
      children: [...data.children],
      effectIds: [...data.effectIds],
      properties: deepCopyProperties(data.properties),
    });
  }
}

/** Deep-copy a properties bag (handles nested Color objects). */
function deepCopyProperties(
  props: Record<string, PropertyValue>,
): Record<string, PropertyValue> {
  const copy: Record<string, PropertyValue> = {};
  for (const key in props) {
    const v = props[key];
    if (v && typeof v === 'object' && 'r' in v) {
      copy[key] = { ...(v as Color) };
    } else {
      copy[key] = v;
    }
  }
  return copy;
}
