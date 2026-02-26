import type { BlockData, Color, PropertyValue } from './block.types';

/**
 * Typed property accessors for block data.
 * Operates on the shared blocks Map owned by BlockStore.
 */
export class BlockProperties {
  #blocks: Map<number, BlockData>;

  constructor(blocks: Map<number, BlockData>) {
    this.#blocks = blocks;
  }

  setProperty(id: number, key: string, value: PropertyValue): void {
    const block = this.#blocks.get(id);
    if (!block) return;
    block.properties[key] = value;
  }

  getProperty(id: number, key: string): PropertyValue | undefined {
    return this.#blocks.get(id)?.properties[key];
  }

  getFloat(id: number, key: string): number {
    const v = this.getProperty(id, key);
    return typeof v === 'number' ? v : 0;
  }

  getString(id: number, key: string): string {
    const v = this.getProperty(id, key);
    return typeof v === 'string' ? v : '';
  }

  getBool(id: number, key: string): boolean {
    const v = this.getProperty(id, key);
    return typeof v === 'boolean' ? v : false;
  }

  getColor(id: number, key: string): Color {
    const v = this.getProperty(id, key);
    if (v && typeof v === 'object' && 'r' in v) return v as Color;
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  getPropertyKeys(id: number): string[] {
    return Object.keys(this.#blocks.get(id)?.properties ?? {});
  }
}
