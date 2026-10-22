import type { BlockData } from "./block.types";

export class BlockReferences {
  constructor(
    private readonly blocks: Map<number, BlockData>,
    private readonly changing: (id: number) => void,
  ) {}

  appendEffect(id: number, effectId: number): void {
    const block = this.blocks.get(id);
    if (!block || block.effectIds.includes(effectId)) return;
    this.changing(id);
    block.effectIds.push(effectId);
  }

  insertEffect(id: number, effectId: number, index: number): void {
    const block = this.blocks.get(id);
    if (!block || block.effectIds.includes(effectId)) return;
    this.changing(id);
    block.effectIds.splice(index, 0, effectId);
  }

  removeEffect(id: number, index: number): number | null {
    const block = this.blocks.get(id);
    if (!block || index < 0 || index >= block.effectIds.length) return null;
    this.changing(id);
    return block.effectIds.splice(index, 1)[0];
  }

  getEffects(id: number): number[] {
    return this.blocks.get(id)?.effectIds.slice() ?? [];
  }

  findEffectOwner(effectId: number): number | null {
    for (const [id, block] of this.blocks) {
      if (block.effectIds.includes(effectId)) return id;
    }
    return null;
  }

  findSubBlockOwner(subId: number): number | null {
    for (const [id, block] of this.blocks) {
      if (block.fillId === subId || block.shapeId === subId || block.effectIds.includes(subId))
        return id;
    }
    return null;
  }

  setShape(id: number, shapeId: number): void {
    const block = this.blocks.get(id);
    if (!block) return;
    this.changing(id);
    block.shapeId = shapeId;
  }

  getShape(id: number): number | null {
    return this.blocks.get(id)?.shapeId ?? null;
  }

  setFill(id: number, fillId: number): void {
    const block = this.blocks.get(id);
    if (!block) return;
    this.changing(id);
    block.fillId = fillId;
  }

  getFill(id: number): number | null {
    return this.blocks.get(id)?.fillId ?? null;
  }
}
