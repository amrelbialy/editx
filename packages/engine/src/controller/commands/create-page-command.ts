import type { BlockStore } from "../../block/block-store";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import { withPageNavigation } from "../../page-history";
import { PatchCommand } from "./patch-command";

export class CreatePageCommand extends PatchCommand {
  #createdId: number | null = null;

  constructor(
    private readonly store: BlockStore,
    private readonly sceneId: number,
    private readonly activePageId: number | null,
    private readonly width: number,
    private readonly height: number,
  ) {
    super();
  }

  do(): Patch[] {
    if (this.store.getType(this.sceneId) !== "scene") {
      throw new Error(`Scene ${this.sceneId} does not exist or is not a scene`);
    }
    if (
      !Number.isFinite(this.width) ||
      this.width <= 0 ||
      !Number.isFinite(this.height) ||
      this.height <= 0
    ) {
      throw new RangeError("Page dimensions must be finite positive numbers");
    }

    const sceneBefore = this.store.snapshot(this.sceneId);
    const pageId = this.store.create("page");
    this.store.setProperty(pageId, PAGE_WIDTH, this.width);
    this.store.setProperty(pageId, PAGE_HEIGHT, this.height);
    this.store.appendChild(this.sceneId, pageId);
    this.#createdId = pageId;

    return [
      withPageNavigation(
        { id: this.sceneId, before: sceneBefore, after: this.store.snapshot(this.sceneId) },
        { sceneId: this.sceneId, pageId: this.activePageId },
        { sceneId: this.sceneId, pageId },
      ),
      { id: pageId, before: null, after: this.store.snapshot(pageId) },
    ];
  }

  getCreatedId(): number | null {
    return this.#createdId;
  }
}
