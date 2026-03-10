import { BlockStore } from '../../block/block-store';
import { ShapeType } from '../../block/block.types';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class CreateShapeCommand extends PatchCommand {
  #store: BlockStore;
  #shapeType: ShapeType;
  #createdId: number | null = null;

  constructor(store: BlockStore, shapeType: ShapeType) {
    super();
    this.#store = store;
    this.#shapeType = shapeType;
  }

  do(): Patch[] {
    const id = this.#store.createShape(this.#shapeType);
    this.#createdId = id;
    return [
      {
        id: String(id),
        before: null,
        after: this.#store.snapshot(id),
      },
    ];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }
}
