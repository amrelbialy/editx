import { BlockStore } from '../../block/block-store';
import { BlockType } from '../../block/block.types';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export class CreateBlockCommand extends PatchCommand {
  #store: BlockStore;
  #type: BlockType;
  #kind: string;
  #createdId: number | null = null;

  constructor(store: BlockStore, type: BlockType, kind = '') {
    super();
    this.#store = store;
    this.#type = type;
    this.#kind = kind;
  }

  do(): Patch[] {
    const id = this.#store.create(this.#type, this.#kind);
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
