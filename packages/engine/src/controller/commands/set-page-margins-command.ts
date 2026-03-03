import { BlockStore } from '../../block/block-store';
import {
  PAGE_MARGIN_ENABLED,
  PAGE_MARGIN_TOP, PAGE_MARGIN_RIGHT,
  PAGE_MARGIN_BOTTOM, PAGE_MARGIN_LEFT,
} from '../../block/property-keys';
import { Patch } from '../../history-manager';
import PatchCommand from './patch-command';

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Batch-sets all page margin properties in a single undoable command.
 */
export class SetPageMarginsCommand extends PatchCommand {
  #store: BlockStore;
  #pageId: number;
  #margins: PageMargins;

  constructor(store: BlockStore, pageId: number, margins: PageMargins) {
    super();
    this.#store = store;
    this.#pageId = pageId;
    this.#margins = margins;
  }

  do(): Patch[] {
    const before = this.#store.snapshot(this.#pageId);

    this.#store.setProperty(this.#pageId, PAGE_MARGIN_ENABLED, true);
    this.#store.setProperty(this.#pageId, PAGE_MARGIN_TOP, this.#margins.top);
    this.#store.setProperty(this.#pageId, PAGE_MARGIN_RIGHT, this.#margins.right);
    this.#store.setProperty(this.#pageId, PAGE_MARGIN_BOTTOM, this.#margins.bottom);
    this.#store.setProperty(this.#pageId, PAGE_MARGIN_LEFT, this.#margins.left);

    const after = this.#store.snapshot(this.#pageId);
    return [{ id: String(this.#pageId), before, after }];
  }
}
