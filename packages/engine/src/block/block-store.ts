import { BlockData, BlockType, Color, PropertyValue } from './block.types';
import { getBlockDefaults } from './block-defaults';
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
      properties: getBlockDefaults(type),
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

  getPropertyKeys(id: number): string[] {
    return this.#properties.getPropertyKeys(id);
  }

  // --- Snapshots (delegated) ---

  snapshot(id: number): BlockData | null {
    return this.#snapshots.snapshot(id);
  }

  restore(data: BlockData): void {
    this.#snapshots.restore(data);
  }
}

