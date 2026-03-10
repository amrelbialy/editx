import { BlockStore } from '../../block/block-store';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class SetShapeCommand extends PatchCommand {
  #store: BlockStore;
  #blockId: number;
  #shapeId: number;

  constructor(store: BlockStore, blockId: number, shapeId: number) {
    super();
    this.#store = store;
    this.#blockId = blockId;
    this.#shapeId = shapeId;
  }

  do(): Patch[] {
    const blockBefore = this.#store.snapshot(this.#blockId);

    this.#store.setShape(this.#blockId, this.#shapeId);

    const blockAfter = this.#store.snapshot(this.#blockId);

    return [
      { id: String(this.#blockId), before: blockBefore, after: blockAfter },
    ];
  }
}
