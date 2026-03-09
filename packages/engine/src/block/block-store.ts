import { BlockData, BlockType, Color, EffectType, PropertyValue } from './block.types';
import { getBlockDefaults, getEffectDefaults } from './block-defaults';
import { BlockHierarchy } from './block-hierarchy';
import { BlockProperties } from './block-properties';
import { BlockSnapshot } from './block-snapshot';

/**
 * Central block registry. Owns the blocks Map and delegates domain logic
 * to focused sub-modules (hierarchy, properties, snapshots).
 */
export class BlockStore {
  #blocks = new Map<number, BlockData>();
  #nextId = 1;

  #hierarchy: BlockHierarchy;
  #properties: BlockProperties;
  #snapshots: BlockSnapshot;

  constructor() {
    this.#hierarchy = new BlockHierarchy(this.#blocks);
    this.#properties = new BlockProperties(this.#blocks);
    this.#snapshots = new BlockSnapshot(this.#blocks);
  }

  // --- CRUD ---

  create(type: BlockType, kind = ''): number {
    const id = this.#nextId++;
    const block: BlockData = {
      id,
      type,
      kind,
      name: `${type}-${id}`,
      parentId: null,
      children: [],
      effectIds: [],
      properties: getBlockDefaults(type),
    };
    this.#blocks.set(id, block);
    return id;
  }

  createEffect(effectType: EffectType): number {
    const id = this.#nextId++;
    const block: BlockData = {
      id,
      type: 'effect',
      kind: effectType,
      name: `effect-${effectType}-${id}`,
      parentId: null,
      children: [],
      effectIds: [],
      properties: getEffectDefaults(effectType),
    };
    this.#blocks.set(id, block);
    return id;
  }

  get(id: number): BlockData | undefined {
    return this.#blocks.get(id);
  }

  exists(id: number): boolean {
    return this.#blocks.has(id);
  }

  destroy(id: number): void {
    const block = this.#blocks.get(id);
    if (!block) return;

    this.#hierarchy.unparent(id);

    // Remove from any parent's effectIds list
    if (block.type === 'effect') {
      for (const [, b] of this.#blocks) {
        const idx = b.effectIds.indexOf(id);
        if (idx !== -1) {
          b.effectIds.splice(idx, 1);
          break;
        }
      }
    }

    // Recursively destroy attached effects
    for (const effectId of [...block.effectIds]) {
      this.destroy(effectId);
    }

    // Recursively destroy children
    for (const childId of [...block.children]) {
      this.destroy(childId);
    }

    this.#blocks.delete(id);
  }

  // --- Type / Kind / Name ---

  getType(id: number): BlockType | undefined {
    return this.#blocks.get(id)?.type;
  }

  getKind(id: number): string {
    return this.#blocks.get(id)?.kind ?? '';
  }

  setKind(id: number, kind: string): void {
    const block = this.#blocks.get(id);
    if (block) block.kind = kind;
  }

  setName(id: number, name: string): void {
    const block = this.#blocks.get(id);
    if (block) block.name = name;
  }

  getName(id: number): string {
    return this.#blocks.get(id)?.name ?? '';
  }

  // --- Query ---

  findByType(type: BlockType): number[] {
    const result: number[] = [];
    for (const [id, block] of this.#blocks) {
      if (block.type === type) result.push(id);
    }
    return result;
  }

  findByKind(kind: string): number[] {
    const result: number[] = [];
    for (const [id, block] of this.#blocks) {
      if (block.kind === kind) result.push(id);
    }
    return result;
  }

  // --- Hierarchy (delegated) ---

  appendChild(parentId: number, childId: number): void {
    this.#hierarchy.appendChild(parentId, childId);
  }

  removeChild(parentId: number, childId: number): void {
    this.#hierarchy.removeChild(parentId, childId);
  }

  getChildren(id: number): number[] {
    return this.#hierarchy.getChildren(id);
  }

  getParent(id: number): number | null {
    return this.#hierarchy.getParent(id);
  }

  // --- Effects ---

  appendEffect(blockId: number, effectId: number): void {
    const block = this.#blocks.get(blockId);
    if (!block) return;
    if (!block.effectIds.includes(effectId)) {
      block.effectIds.push(effectId);
    }
  }

  insertEffect(blockId: number, effectId: number, index: number): void {
    const block = this.#blocks.get(blockId);
    if (!block) return;
    if (!block.effectIds.includes(effectId)) {
      block.effectIds.splice(index, 0, effectId);
    }
  }

  removeEffect(blockId: number, index: number): number | null {
    const block = this.#blocks.get(blockId);
    if (!block || index < 0 || index >= block.effectIds.length) return null;
    const [removed] = block.effectIds.splice(index, 1);
    return removed;
  }

  getEffects(id: number): number[] {
    return this.#blocks.get(id)?.effectIds.slice() ?? [];
  }

  /** Find the design block that owns this effect block. */
  findEffectOwner(effectId: number): number | null {
    for (const [id, block] of this.#blocks) {
      if (block.effectIds.includes(effectId)) return id;
    }
    return null;
  }

  // --- Properties (delegated) ---

  setProperty(id: number, key: string, value: PropertyValue): void {
    this.#properties.setProperty(id, key, value);
  }

  getProperty(id: number, key: string): PropertyValue | undefined {
    return this.#properties.getProperty(id, key);
  }

  getFloat(id: number, key: string): number {
    return this.#properties.getFloat(id, key);
  }

  getString(id: number, key: string): string {
    return this.#properties.getString(id, key);
  }

  getBool(id: number, key: string): boolean {
    return this.#properties.getBool(id, key);
  }

  getColor(id: number, key: string): Color {
    return this.#properties.getColor(id, key);
  }

  findAllProperties(id: number): string[] {
    return this.#properties.findAllProperties(id);
  }

  // --- Snapshots (delegated) ---

  snapshot(id: number): BlockData | null {
    return this.#snapshots.snapshot(id);
  }

  restore(data: BlockData): void {
    this.#snapshots.restore(data);
  }
}

