import type { BlockStore } from "../../block/block-store";
import type { Patch } from "../../history-manager";
import { withPageNavigation } from "../../page-history";
import { DuplicateBlockCommand } from "./duplicate-block-command";
import { PatchCommand } from "./patch-command";

export class DuplicatePageCommand extends PatchCommand {
  #createdId: number | null = null;

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
    const page = this.store.get(this.pageId);
    if (
      page?.type !== "page" ||
      page.parentId !== this.sceneId ||
      !scene.children.includes(this.pageId)
    ) {
      throw new Error(`Page ${this.pageId} not found in scene`);
    }

    const command = new DuplicateBlockCommand(
      this.store,
      this.pageId,
      0,
      scene.children.indexOf(this.pageId) + 1,
    );
    const patches = command.do();
    this.#createdId = command.getCreatedId()!;
    patches[0] = withPageNavigation(
      patches[0],
      { sceneId: this.sceneId, pageId: this.activePageId },
      { sceneId: this.sceneId, pageId: this.#createdId },
    );
    return patches;
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }
}
