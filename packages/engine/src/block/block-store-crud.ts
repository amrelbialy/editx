import type {
  BlockData,
  BlockType,
  EffectType,
  FillType,
  PropertyValue,
  ShapeType,
} from "./block.types";
import {
  getBlockDefaults,
  getEffectDefaults,
  getFillDefaults,
  getShapeDefaults,
} from "./block-defaults";
import type { BlockHierarchy } from "./block-hierarchy";

export class BlockCreation {
  #nextId = 1;

  constructor(
    private readonly blocks: Map<number, BlockData>,
    private readonly changing: (id: number) => void = () => {},
  ) {}

  create(type: BlockType, kind = ""): number {
    return this.#create(type, kind, type, getBlockDefaults(type));
  }

  createEffect(type: EffectType): number {
    return this.#create("effect", type, `effect-${type}`, getEffectDefaults(type));
  }

  createShape(type: ShapeType): number {
    return this.#create("shape", type, `shape-${type}`, getShapeDefaults(type));
  }

  createFill(type: FillType): number {
    return this.#create("fill", type, `fill-${type}`, getFillDefaults(type));
  }

  resetNextId(nextId: number): void {
    this.#nextId = nextId;
  }

  #create(
    type: BlockType,
    kind: string,
    name: string,
    defaults: Record<string, PropertyValue>,
  ): number {
    if (this.#nextId >= Number.MAX_SAFE_INTEGER) {
      throw new RangeError("Block ID space is exhausted");
    }
    const id = this.#nextId++;
    this.changing(id);
    this.blocks.set(id, createBlockData(id, type, kind, `${name}-${id}`, defaults));
    return id;
  }
}

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
  changing: (id: number) => void = () => {},
): void {
  const block = blocks.get(id);
  if (!block) return;

  hierarchy.unparent(id);

  if (block.type === "effect") {
    for (const [, b] of blocks) {
      const idx = b.effectIds.indexOf(id);
      if (idx !== -1) {
        changing(b.id);
        b.effectIds.splice(idx, 1);
        break;
      }
    }
  }
  if (block.type === "shape") {
    for (const [, b] of blocks) {
      if (b.shapeId === id) {
        changing(b.id);
        b.shapeId = null;
        break;
      }
    }
  }
  if (block.type === "fill") {
    for (const [, b] of blocks) {
      if (b.fillId === id) {
        changing(b.id);
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
