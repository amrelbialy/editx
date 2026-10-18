import type { BlockData } from "../../block/block.types";
import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import {
  applyPageProperties,
  type PagePropertiesUpdate,
  readPageProperties,
  requireScenePage,
  samePageProperties,
} from "../../page-properties";
import { PatchCommand } from "./patch-command";

export class SetPagePropertiesCommand extends PatchCommand {
  readonly hasChanges: boolean;
  #before: BlockData;
  #after: BlockData;

  constructor(
    private readonly store: BlockStore,
    sceneId: number | null,
    private readonly pageId: number,
    update: PagePropertiesUpdate,
  ) {
    super();
    requireScenePage(store, sceneId, pageId);
    this.#before = store.snapshot(pageId)!;
    this.#after = applyPageProperties(this.#before, update);
    this.hasChanges = !samePageProperties(
      readPageProperties(this.#before),
      readPageProperties(this.#after),
    );
  }

  do(): Patch[] {
    if (!this.hasChanges) return [];
    this.store.restore(this.#after);
    return [{ id: this.pageId, before: this.#before, after: this.store.snapshot(this.pageId) }];
  }
}
