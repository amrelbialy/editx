import { BlockData, BlockType, Color, PropertyValue } from "./block.types";
import { getBlockDefaults } from "./block-defaults";

export class BlockStore {
  #blocks = new Map<number, BlockData>();
  #nextId = 1;

  create(type: BlockType, kind = ""): number {
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

    // Unparent from parent
    if (block.parentId !== null) {
      const parent = this.#blocks.get(block.parentId);
      if (parent) {
        parent.children = parent.children.filter((c) => c !== id);
      }
    }

    // Recursively destroy children
    for (const childId of [...block.children]) {
      this.destroy(childId);
    }

    this.#blocks.delete(id);
  }

  // --- Hierarchy ---

  appendChild(parentId: number, childId: number): void {
    const parent = this.#blocks.get(parentId);
    const child = this.#blocks.get(childId);
    if (!parent || !child) return;

    // Remove from old parent if any
    if (child.parentId !== null && child.parentId !== parentId) {
      const oldParent = this.#blocks.get(child.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter((c) => c !== childId);
      }
    }

    child.parentId = parentId;
    if (!parent.children.includes(childId)) {
      parent.children.push(childId);
    }
  }

  removeChild(parentId: number, childId: number): void {
    const parent = this.#blocks.get(parentId);
    const child = this.#blocks.get(childId);
    if (!parent || !child) return;

    parent.children = parent.children.filter((c) => c !== childId);
    if (child.parentId === parentId) {
      child.parentId = null;
    }
  }

  getChildren(id: number): number[] {
    return this.#blocks.get(id)?.children.slice() ?? [];
  }

  getParent(id: number): number | null {
    return this.#blocks.get(id)?.parentId ?? null;
  }

  // --- Properties ---

  setProperty(id: number, key: string, value: PropertyValue): void {
    const block = this.#blocks.get(id);
    if (!block) return;
    block.properties[key] = value;
    // console.log("setProperty", id, key, value);
    // console.log("block", block);
  }

  getProperty(id: number, key: string): PropertyValue | undefined {
    return this.#blocks.get(id)?.properties[key];
  }

  getFloat(id: number, key: string): number {
    const v = this.getProperty(id, key);
    return typeof v === "number" ? v : 0;
  }

  getString(id: number, key: string): string {
    const v = this.getProperty(id, key);
    return typeof v === "string" ? v : "";
  }

  getBool(id: number, key: string): boolean {
    const v = this.getProperty(id, key);
    return typeof v === "boolean" ? v : false;
  }

  getColor(id: number, key: string): Color {
    const v = this.getProperty(id, key);
    if (v && typeof v === "object" && "r" in v) return v as Color;
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  // --- Type / Kind ---

  getType(id: number): BlockType | undefined {
    return this.#blocks.get(id)?.type;
  }

  getKind(id: number): string {
    return this.#blocks.get(id)?.kind ?? "";
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
    return this.#blocks.get(id)?.name ?? "";
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

  getPropertyKeys(id: number): string[] {
    return Object.keys(this.#blocks.get(id)?.properties ?? {});
  }

  // --- Snapshot for undo/redo ---

  snapshot(id: number): BlockData | null {
    const block = this.#blocks.get(id);
    if (!block) return null;

    return {
      ...block,
      children: [...block.children],
      properties: this.#deepCopyProperties(block.properties),
    };
  }

  restore(data: BlockData): void {
    this.#blocks.set(data.id, {
      ...data,
      children: [...data.children],
      properties: this.#deepCopyProperties(data.properties),
    });
  }

  #deepCopyProperties(
    props: Record<string, PropertyValue>
  ): Record<string, PropertyValue> {
    const copy: Record<string, PropertyValue> = {};
    for (const key in props) {
      const v = props[key];
      if (v && typeof v === "object" && "r" in v) {
        copy[key] = { ...(v as Color) };
      } else {
        copy[key] = v;
      }
    }
    return copy;
  }
}
