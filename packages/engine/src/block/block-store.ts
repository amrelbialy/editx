import type {
  BlockData,
  BlockType,
  Color,
  EffectType,
  FillType,
  PropertyValue,
  ShapeType,
} from "./block.types";
import { BlockHierarchy } from "./block-hierarchy";
import { BlockProperties } from "./block-properties";
import { BlockReferences } from "./block-references";
import { BlockSnapshot } from "./block-snapshot";
import { BlockCreation, destroyBlock } from "./block-store-crud";

export class BlockStore {
  #blocks = new Map<number, BlockData>();
  #observers = new Set<(id: number) => void>();
  #changing = (id: number): void => {
    for (const observer of this.#observers) observer(id);
  };
  #creation = new BlockCreation(this.#blocks, this.#changing);
  #references = new BlockReferences(this.#blocks, this.#changing);

  #hierarchy: BlockHierarchy;
  #properties: BlockProperties;
  #snapshots: BlockSnapshot;

  constructor() {
    this.#hierarchy = new BlockHierarchy(this.#blocks, this.#changing);
    this.#properties = new BlockProperties(this.#blocks, this.#changing);
    this.#snapshots = new BlockSnapshot(this.#blocks);
  }

  /** @internal — observe persisted writes before their records change. */
  _observeMutations(observer: (id: number) => void): () => void {
    this.#observers.add(observer);
    return () => {
      this.#observers.delete(observer);
    };
  }

  create(type: BlockType, kind = ""): number {
    return this.#creation.create(type, kind);
  }

  createEffect(effectType: EffectType): number {
    return this.#creation.createEffect(effectType);
  }

  createShape(shapeType: ShapeType): number {
    return this.#creation.createShape(shapeType);
  }

  createFill(fillType: FillType): number {
    return this.#creation.createFill(fillType);
  }

  get(id: number): BlockData | undefined {
    return this.#blocks.get(id);
  }

  exists(id: number): boolean {
    return this.#blocks.has(id);
  }

  destroy(id: number): void {
    this.#changing(id);
    destroyBlock(
      this.#blocks,
      this.#hierarchy,
      id,
      (childId) => this.destroy(childId),
      this.#changing,
    );
  }

  getType(id: number): BlockType | undefined {
    return this.#blocks.get(id)?.type;
  }

  getKind(id: number): string {
    return this.#blocks.get(id)?.kind ?? "";
  }

  setKind(id: number, kind: string): void {
    const block = this.#blocks.get(id);
    if (block) this.#changing(id);
    if (block) block.kind = kind;
  }

  setName(id: number, name: string): void {
    const block = this.#blocks.get(id);
    if (block) this.#changing(id);
    if (block) block.name = name;
  }

  getName(id: number): string {
    return this.#blocks.get(id)?.name ?? "";
  }

  getAllBlockIds(): number[] {
    return [...this.#blocks.keys()];
  }

  clear(): void {
    for (const id of this.#blocks.keys()) this.#changing(id);
    this.#blocks.clear();
    this.#creation.resetNextId(1);
  }

  resetNextId(nextId: number): void {
    this.#creation.resetNextId(nextId);
  }

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

  canAppendChild(parentId: number, childId: number): boolean {
    return this.#hierarchy.canAppendChild(parentId, childId);
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
    this.#references.appendEffect(blockId, effectId);
  }

  insertEffect(blockId: number, effectId: number, index: number): void {
    this.#references.insertEffect(blockId, effectId, index);
  }

  removeEffect(blockId: number, index: number): number | null {
    return this.#references.removeEffect(blockId, index);
  }

  getEffects(id: number): number[] {
    return this.#references.getEffects(id);
  }

  /** Find the design block that owns this effect block. */
  findEffectOwner(effectId: number): number | null {
    return this.#references.findEffectOwner(effectId);
  }

  /** Find the owner of any sub-block (fill, shape, or effect). */
  findSubBlockOwner(subId: number): number | null {
    return this.#references.findSubBlockOwner(subId);
  }

  // --- Shape sub-block ---

  setShape(blockId: number, shapeId: number): void {
    this.#references.setShape(blockId, shapeId);
  }

  getShape(blockId: number): number | null {
    return this.#references.getShape(blockId);
  }

  supportsShape(blockId: number): boolean {
    return this.#blocks.get(blockId)?.type === "graphic";
  }

  // --- Fill sub-block ---

  setFill(blockId: number, fillId: number): void {
    this.#references.setFill(blockId, fillId);
  }

  getFill(blockId: number): number | null {
    return this.#references.getFill(blockId);
  }

  supportsFill(blockId: number): boolean {
    return this.#blocks.get(blockId)?.type === "graphic";
  }

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

  snapshot(id: number): BlockData | null {
    return this.#snapshots.snapshot(id);
  }

  restore(data: BlockData): void {
    this.#changing(data.id);
    this.#snapshots.restore(data);
  }
}
