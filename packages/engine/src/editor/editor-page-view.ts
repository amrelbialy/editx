import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import {
  type PageViewBounds,
  PageViewError,
  type PageViewMode,
  type RendererPageView,
  type RendererPageViewPage,
} from "../page-view";
import { getOwningPageId } from "../page-view-ownership";
import type { EditorContext } from "./editor-context";

interface CropAccess {
  activeBlockId(): number | null;
  cancel(): void;
}

/** Transient editor concern coordinating page isolation with renderer/editor state. */
export class EditorPageView {
  #mode: PageViewMode = "all-pages";
  #disposed = false;
  #settledPageId: number | null | undefined;

  constructor(
    private readonly ctx: EditorContext,
    private readonly crop: CropAccess,
  ) {}

  getMode(): PageViewMode {
    return this.#mode;
  }

  setMode(mode: PageViewMode): void {
    if (
      mode !== "all-pages" &&
      mode !== "active-page" &&
      mode !== "vertical-pages" &&
      mode !== "horizontal-pages"
    ) {
      throw new TypeError(`Invalid page view mode: ${String(mode)}`);
    }
    if (this.#disposed) {
      throw new PageViewError("ENGINE_DISPOSED", "Cannot change page view after engine disposal");
    }

    const renderer = this.ctx.renderer;
    const view = this.#makeView(mode);
    if (mode !== "all-pages") {
      if (!renderer) {
        throw new PageViewError("NO_RENDERER", "Non-legacy page view requires a renderer");
      }
      if (!renderer.setPageView) {
        throw new PageViewError(
          "UNSUPPORTED_RENDERER",
          "The attached renderer does not support page views",
        );
      }
      if (this.#isContinuous(mode) && !renderer.getPageViewBounds) {
        throw new PageViewError(
          "UNSUPPORTED_RENDERER",
          "The attached renderer does not support continuous page bounds",
        );
      }
      if (mode !== this.#mode) this.#settleInteractions();
      renderer.setPageView(view);
    } else {
      if (mode !== this.#mode) this.#settleInteractions();
      renderer?.setPageView?.(view);
    }

    this.#mode = mode;
    if (mode !== "all-pages") {
      this.#settledPageId = this.ctx.engine.getActivePage();
      this.#cleanupTransientState(true);
    } else {
      this.#settledPageId = undefined;
    }
  }

  reconcile(): void {
    if (this.#disposed || this.#mode === "all-pages") return;
    this.ctx.renderer?.setPageView?.(this.#makeView(this.#mode));
    this.#cleanupTransientState();
  }

  getBounds(pageId: number): PageViewBounds | null {
    return this.ctx.renderer?.getPageViewBounds?.(pageId) ?? null;
  }

  dispose(): void {
    this.#disposed = true;
  }

  prepareSceneReplacement(): void {
    this.ctx.engine.emit("_scene:replacing");
    this.#settleInteractions();
    this.ctx.block?.deselectAll();
    this.ctx.block?._clearGroupContext();
    this.#settledPageId = undefined;
  }

  #makeView(mode: PageViewMode): RendererPageView {
    if (mode === "all-pages") return { mode };
    const activePageId = this.ctx.engine.getActivePage();
    if (mode === "active-page") return { mode, activePageId };
    return { mode, activePageId, pages: this.#getPages() };
  }

  #getPages(): RendererPageViewPage[] {
    const store = this.ctx.engine._getBlockStore();
    const sceneId = this.ctx.engine.getActiveScene();
    const scene = sceneId === null ? undefined : store.get(sceneId);
    if (scene?.type !== "scene") return [];
    const pages: RendererPageViewPage[] = [];
    for (const id of scene.children) {
      const page = store.get(id);
      if (page?.type !== "page" || page.parentId !== sceneId) continue;
      pages.push({
        id,
        width: (page.properties[PAGE_WIDTH] as number) ?? 1080,
        height: (page.properties[PAGE_HEIGHT] as number) ?? 1080,
      });
    }
    return pages;
  }

  #isContinuous(mode: PageViewMode): boolean {
    return mode === "vertical-pages" || mode === "horizontal-pages";
  }

  #settleInteractions(): void {
    if (this.crop.activeBlockId() !== null) this.crop.cancel();
    const block = this.ctx.block;
    if (!block) return;
    for (const id of this.ctx.engine._getBlockStore().getAllBlockIds()) {
      if (block.getTextEditingSession(id)) block.endTextEditing(id);
    }
  }

  #cleanupTransientState(endHiddenText = false): void {
    const block = this.ctx.block;
    if (!block) return;
    const store = this.ctx.engine._getBlockStore();
    const activePageId = this.ctx.engine.getActivePage();
    const pageChanged = this.#settledPageId !== activePageId;
    this.#settledPageId = activePageId;

    const cropBlockId = this.crop.activeBlockId();
    if (
      cropBlockId !== null &&
      (pageChanged || getOwningPageId(store, cropBlockId) !== activePageId)
    ) {
      this.crop.cancel();
    }

    if (pageChanged || endHiddenText) {
      for (const id of store.getAllBlockIds()) {
        if (getOwningPageId(store, id) !== activePageId && block.getTextEditingSession(id)) {
          block.endTextEditing(id);
        }
      }
    }

    if (pageChanged) {
      block.deselectAll();
      block._clearGroupContext();
      return;
    }

    const hiddenSelection = block
      .findAllSelected()
      .filter((id) => getOwningPageId(store, id) !== activePageId);
    if (hiddenSelection.length > 0) block._removeFromSelection(hiddenSelection);
    if (block.getGroupContext().some((id) => getOwningPageId(store, id) !== activePageId)) {
      block._clearGroupContext();
    }
  }
}
