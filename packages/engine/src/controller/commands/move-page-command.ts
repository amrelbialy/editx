import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { getScenePages } from "../../page-order";
import { PatchCommand } from "./patch-command";

export class MovePageCommand extends PatchCommand {
  readonly hasChanges: boolean;
  #orderedChildren: number[];

  constructor(
    private readonly store: BlockStore,
    private readonly sceneId: number,
    pageId: number,
    index: number,
  ) {
    super();
    const scene = store.get(sceneId);
    if (scene?.type !== "scene") {
      throw new Error(`Scene ${sceneId} does not exist or is not a scene`);
    }
    const pages = getScenePages(store, sceneId);
    const currentIndex = pages.indexOf(pageId);
    if (currentIndex === -1) throw new Error(`Page ${pageId} not found in scene`);
    if (!Number.isInteger(index)) throw new RangeError("Page index must be a finite integer");
    const targetIndex = Math.max(0, Math.min(index, pages.length - 1));
    this.hasChanges = currentIndex !== targetIndex;
    const pageIds = new Set(pages);
    pages.splice(currentIndex, 1);
    pages.splice(targetIndex, 0, pageId);
    let nextPage = 0;
    this.#orderedChildren = scene.children.map((id) => (pageIds.has(id) ? pages[nextPage++] : id));
  }

  do(): Patch[] {
    if (!this.hasChanges) return [];
    const before = this.store.snapshot(this.sceneId);
    if (!before) throw new Error(`Scene ${this.sceneId} does not exist`);
    this.store.restore({ ...before, children: this.#orderedChildren });
    return [{ id: this.sceneId, before, after: this.store.snapshot(this.sceneId) }];
  }
}
