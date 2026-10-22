import type { BlockData, BlockType } from "./block/block.types";
import type { BlockStore } from "./block/block-store";

interface ImpactNode {
  readonly type: BlockType;
  readonly parentId: number | null;
  readonly children: readonly number[];
  readonly references: readonly number[];
}

type Overrides = ReadonlyMap<number, BlockData | null>;

function nodeFrom(block: BlockData): ImpactNode {
  return {
    type: block.type,
    parentId: block.parentId,
    children: [...block.children],
    references: [
      ...block.children,
      ...block.effectIds,
      ...(block.shapeId === null ? [] : [block.shapeId]),
      ...(block.fillId === null ? [] : [block.fillId]),
    ],
  };
}

class ImpactView {
  #overrides = new Map<number, ImpactNode | null>();
  #owners = new Map<number, Set<number>>();

  constructor(
    private readonly nodes: ReadonlyMap<number, ImpactNode>,
    private readonly owners: ReadonlyMap<number, ReadonlySet<number>>,
    overrides: Overrides,
  ) {
    for (const [id, block] of overrides) {
      const node = block ? nodeFrom(block) : null;
      this.#overrides.set(id, node);
      for (const reference of node?.references ?? []) {
        const owners = this.#owners.get(reference) ?? new Set<number>();
        owners.add(id);
        this.#owners.set(reference, owners);
      }
    }
  }

  get(id: number): ImpactNode | null {
    return this.#overrides.has(id) ? this.#overrides.get(id)! : (this.nodes.get(id) ?? null);
  }

  pages(sceneId: number | null): number[] {
    if (sceneId === null) return [];
    return (this.get(sceneId)?.children ?? []).filter((id) => {
      const page = this.get(id);
      return page?.type === "page" && page.parentId === sceneId;
    });
  }

  owningPages(id: number): number[] {
    const pages = new Set<number>();
    const visited = new Set<number>();
    const pending = [id];
    for (let index = 0; index < pending.length; index++) {
      const current = pending[index];
      if (visited.has(current)) continue;
      visited.add(current);
      if (this.get(current)?.type === "page") {
        pages.add(current);
        continue;
      }
      const owners = new Set([
        ...(this.owners.get(current) ?? []),
        ...(this.#owners.get(current) ?? []),
      ]);
      for (const owner of owners) {
        if (this.get(owner)?.references.includes(current)) pending.push(owner);
      }
    }
    return [...pages];
  }
}

export class DocumentImpactIndex {
  #nodes = new Map<number, ImpactNode>();
  #owners = new Map<number, Set<number>>();

  constructor(store: BlockStore) {
    for (const id of store.getAllBlockIds()) this.update(id, store.get(id) ?? null);
  }

  update(id: number, block: BlockData | null): void {
    for (const reference of this.#nodes.get(id)?.references ?? []) {
      const owners = this.#owners.get(reference);
      owners?.delete(id);
      if (owners?.size === 0) this.#owners.delete(reference);
    }
    this.#nodes.delete(id);
    if (!block) return;
    const node = nodeFrom(block);
    this.#nodes.set(id, node);
    for (const reference of node.references) {
      const owners = this.#owners.get(reference) ?? new Set<number>();
      owners.add(id);
      this.#owners.set(reference, owners);
    }
  }

  affectedPages(
    changedIds: readonly number[],
    before: Overrides,
    after: Overrides,
    oldRoot: number | null,
    newRoot: number | null,
  ): number[] {
    const old = new ImpactView(this.#nodes, this.#owners, before);
    const current = new ImpactView(this.#nodes, this.#owners, after);
    const pages = new Set<number>();
    for (const id of changedIds) {
      for (const page of old.owningPages(id)) pages.add(page);
      for (const page of current.owningPages(id)) pages.add(page);
    }
    for (const id of changedIds) {
      if (old.get(id)?.type !== "scene" && current.get(id)?.type !== "scene") continue;
      const previous = old.pages(id);
      const next = current.pages(id);
      const previousIndex = new Map(previous.map((page, index) => [page, index]));
      const nextIndex = new Map(next.map((page, index) => [page, index]));
      for (const page of [...previous, ...next]) {
        if (previousIndex.get(page) !== nextIndex.get(page)) pages.add(page);
      }
    }
    if (oldRoot !== newRoot) {
      for (const page of old.pages(oldRoot)) pages.add(page);
      for (const page of current.pages(newRoot)) pages.add(page);
    }
    return [...pages];
  }
}
