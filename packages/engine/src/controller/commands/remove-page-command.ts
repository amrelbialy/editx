import { firstScenePage } from "../../active-page";
import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { withPageNavigation } from "../../page-history";
import { DestroyBlockCommand } from "./destroy-block-command";
import { PatchCommand } from "./patch-command";

export class RemovePageCommand extends PatchCommand {
  constructor(
    private readonly store: BlockStore,
    private readonly sceneId: number,
    private readonly pageId: number,
    private readonly activePageId: number | null,
  ) {
    super();
  }

  do(): Patch[] {
    const scene = this.store.get(this.sceneId);
    if (scene?.type !== "scene") {
      throw new Error(`Scene ${this.sceneId} does not exist or is not a scene`);
    }
    const pages = scene.children.filter((id) => {
      const page = this.store.get(id);
      return page?.type === "page" && page.parentId === this.sceneId;
    });
    if (!pages.includes(this.pageId)) {
      throw new Error(`Page ${this.pageId} not found in scene`);
    }
    if (pages.length <= 1) throw new Error("Cannot remove the last page");

    const patches = new DestroyBlockCommand(this.store, this.pageId).do();
    if (this.activePageId === this.pageId) {
      patches[0] = withPageNavigation(
        patches[0],
        { sceneId: this.sceneId, pageId: this.pageId },
        { sceneId: this.sceneId, pageId: firstScenePage(this.store, this.sceneId) },
      );
    }
    return patches;
  }
}
