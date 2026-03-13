import { BlockData, BlockType, Color, EffectType, FillType, PropertyValue, ShapeType } from './block.types';
import { getBlockDefaults, getEffectDefaults, getShapeDefaults, getFillDefaults } from './block-defaults';
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
      shapeId: null,
      fillId: null,
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
      shapeId: null,
      fillId: null,
      properties: getEffectDefaults(effectType),
    };
    this.#blocks.set(id, block);
    return id;
  }

  createShape(shapeType: ShapeType): number {
    const id = this.#nextId++;
    const block: BlockData = {
      id,
      type: 'shape',
      kind: shapeType,
      name: `shape-${shapeType}-${id}`,
      parentId: null,
      children: [],
      effectIds: [],
      shapeId: null,
      fillId: null,
      properties: getShapeDefaults(shapeType),
    };
    this.#blocks.set(id, block);
    return id;
  }

  createFill(fillType: FillType): number {
    const id = this.#nextId++;
    const block: BlockData = {
      id,
      type: 'fill',
      kind: fillType,
      name: `fill-${fillType}-${id}`,
      parentId: null,
      children: [],
      effectIds: [],
      shapeId: null,
      fillId: null,
      properties: getFillDefaults(fillType),
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

    // Remove from any owner's shapeId / fillId reference
    if (block.type === 'shape') {
      for (const [, b] of this.#blocks) {
        if (b.shapeId === id) { b.shapeId = null; break; }
      }
    }
    if (block.type === 'fill') {
      for (const [, b] of this.#blocks) {
        if (b.fillId === id) { b.fillId = null; break; }
      }
    }

    // Recursively destroy attached effects
    for (const effectId of [...block.effectIds]) {
      this.destroy(effectId);
    }

    // Recursively destroy attached shape sub-block
    if (block.shapeId != null) {
      this.destroy(block.shapeId);
    }

    // Recursively destroy attached fill sub-block
    if (block.fillId != null) {
      this.destroy(block.fillId);
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

  moveChildToIndex(parentId: number, childId: number, newIndex: number): void {
    this.#hierarchy.moveChildToIndex(parentId, childId, newIndex);
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

  /** Find the owner of any sub-block (fill, shape, or effect). */
  findSubBlockOwner(subId: number): number | null {
    for (const [id, block] of this.#blocks) {
      if (block.fillId === subId || block.shapeId === subId || block.effectIds.includes(subId)) {
        return id;
      }
    }
    return null;
  }

  // --- Shape sub-block ---

  setShape(blockId: number, shapeId: number): void {
    const block = this.#blocks.get(blockId);
    if (block) block.shapeId = shapeId;
  }

  getShape(blockId: number): number | null {
    return this.#blocks.get(blockId)?.shapeId ?? null;
  }

  supportsShape(blockId: number): boolean {
    return this.#blocks.get(blockId)?.type === 'graphic';
  }

  // --- Fill sub-block ---

  setFill(blockId: number, fillId: number): void {
    const block = this.#blocks.get(blockId);
    if (block) block.fillId = fillId;
  }

  getFill(blockId: number): number | null {
    return this.#blocks.get(blockId)?.fillId ?? null;
  }

  supportsFill(blockId: number): boolean {
    return this.#blocks.get(blockId)?.type === 'graphic';
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

