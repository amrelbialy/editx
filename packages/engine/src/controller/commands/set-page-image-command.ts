import type { BlockStore } from "../../block/block-store";
import { IMAGE_SRC, PAGE_HEIGHT, PAGE_WIDTH } from "../../block/property-keys";
import type { Patch } from "../../history-manager";
import PatchCommand from "./patch-command";

/**
 * Sets the page IMAGE_SRC and optionally auto-adjusts PAGE_WIDTH/HEIGHT
 * to match the image's intrinsic dimensions.
 */
export class SetPageImageCommand extends PatchCommand {
  #store: BlockStore;
  #pageId: number;
  #src: string;
  #width: number | null;
  #height: number | null;

  /**
   * @param store  Block store
   * @param pageId Page block ID
   * @param src    Image source URL (empty string clears the image)
   * @param width  Optional intrinsic width — if provided, PAGE_WIDTH is updated
   * @param height Optional intrinsic height — if provided, PAGE_HEIGHT is updated
   */
  constructor(
    store: BlockStore,
    pageId: number,
    src: string,
    width: number | null = null,
    height: number | null = null,
  ) {
    super();
    this.#store = store;
    this.#pageId = pageId;
    this.#src = src;
    this.#width = width;
    this.#height = height;
  }

  do(): Patch[] {
    const before = this.#store.snapshot(this.#pageId);

    this.#store.setProperty(this.#pageId, IMAGE_SRC, this.#src);
    if (this.#width !== null) {
      this.#store.setProperty(this.#pageId, PAGE_WIDTH, this.#width);
    }
    if (this.#height !== null) {
      this.#store.setProperty(this.#pageId, PAGE_HEIGHT, this.#height);
    }

    const after = this.#store.snapshot(this.#pageId);
    return [{ id: String(this.#pageId), before, after }];
  }
}
