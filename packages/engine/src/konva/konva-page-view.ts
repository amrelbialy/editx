import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import type { PageViewBounds, RendererPageView } from "../page-view";
import { getOwningPageId } from "../page-view-ownership";
import { layoutContinuousPages } from "./konva-page-layout";
import { KonvaPageWrappers } from "./konva-page-wrappers";
import type { KonvaRendererContext } from "./konva-renderer-context";

const FILTERED = "__pageViewFiltered";
const RESTORE_VISIBLE = "__pageViewRestoreVisible";
function pageSize(block: BlockData): { width: number; height: number } {
  return {
    width: (block.properties[PAGE_WIDTH] as number) ?? 1080,
    height: (block.properties[PAGE_HEIGHT] as number) ?? 1080,
  };
}

export class KonvaPageView {
  readonly #lookup: { get: (blockId: number) => BlockData | undefined };
  readonly #wrappers: KonvaPageWrappers;
  #bounds = new Map<number, PageViewBounds>();
  constructor(private readonly context: KonvaRendererContext) {
    this.#lookup = { get: (blockId) => context.callbacks.resolveBlock?.(blockId) };
    this.#wrappers = new KonvaPageWrappers(context);
  }
  initialize(page: BlockData): void {
    this.#wrappers.dispose();
    const size = pageSize(page);
    this.context.pageSizes.clear();
    this.context.pageSizes.set(page.id, size);
    this.context.legacyPageSize = size;
    this.#rebuildBounds();
    this.#reconcilePageSize();
  }
  set(view: RendererPageView): void {
    this.context.pageView =
      view.mode === "all-pages"
        ? { mode: "all-pages" }
        : view.mode === "active-page"
          ? { mode: "active-page", activePageId: view.activePageId }
          : { ...view, pages: view.pages.map((page) => ({ ...page })) };
    this.#rebuildBounds();
    this.apply(true);
    this.#reconcilePageSize();
    this.context.contentLayer?.batchDraw();
    this.context.uiLayer?.batchDraw();
  }
  recordPage(block: BlockData): void {
    const size = pageSize(block);
    this.context.pageSizes.set(block.id, size);
    this.context.legacyPageSize = size;
    if (this.context.pageView.mode === "all-pages") {
      this.#bounds.set(block.id, { x: 0, y: 0, ...size });
    } else if (
      this.context.pageView.mode === "active-page" &&
      this.context.pageView.activePageId === block.id
    ) {
      this.#bounds.set(block.id, { x: 0, y: 0, ...size });
    }
    if (
      this.context.pageView.mode === "all-pages" ||
      (this.context.pageView.mode === "active-page" &&
        this.context.pageView.activePageId === block.id)
    ) {
      this.#usePageSize(size);
    }
  }
  recordNodeSync(id: number, node: Konva.Node): void {
    if (node.getAttr(FILTERED) === true) {
      node.setAttr(RESTORE_VISIBLE, node.visible());
    }
    this.#applyNode(id, node);
    const view = this.context.pageView;
    if (view.mode !== "vertical-pages" && view.mode !== "horizontal-pages") return;
    const block = this.#lookup.get(id);
    const parent = block?.parentId == null ? undefined : this.#lookup.get(block.parentId);
    const pageId = block?.type === "page" ? id : parent?.type === "page" ? parent.id : null;
    const frame = pageId === null ? undefined : this.#bounds.get(pageId);
    if (pageId !== null && frame) this.#wrappers.syncRoot(pageId, node, frame);
  }
  remove(id: number): void {
    this.context.pageSizes.delete(id);
    this.#bounds.delete(id);
  }
  apply(force = false): void {
    if (!force && this.context.pageView.mode === "all-pages") return;
    for (const [id, node] of this.context.nodeMap) this.#applyNode(id, node);
    const view = this.context.pageView;
    if (
      this.context.contentLayer &&
      (view.mode === "vertical-pages" || view.mode === "horizontal-pages")
    ) {
      this.#wrappers.apply(view.pages, this.#bounds);
    } else if (this.context.contentLayer) {
      this.#wrappers.unwrap();
    }
    if (this.context.pageView.mode === "active-page") {
      this.#isolateActivePageDrawOrder();
    } else if (this.context.pageView.mode === "all-pages") {
      this.#restoreLegacyPageDrawOrder();
    }
    const transformer = this.context.transformer;
    if (transformer) transformer.nodes(transformer.nodes().filter((node) => node.isVisible()));
  }
  withUnfiltered<T>(capture: () => T): T {
    const filtered: Konva.Node[] = [];
    for (const node of this.context.nodeMap.values()) {
      if (node.getAttr(FILTERED) === true) {
        filtered.push(node);
        node.visible(node.getAttr(RESTORE_VISIBLE) !== false);
      }
    }
    const view = this.context.pageView;
    const continuous = view.mode === "vertical-pages" || view.mode === "horizontal-pages";
    if (continuous) this.#wrappers.unwrap();
    if (this.context.pageView.mode !== "all-pages") this.#restoreLegacyPageDrawOrder();
    try {
      return capture();
    } finally {
      if (continuous) this.#wrappers.apply(view.pages, this.#bounds);
      for (const node of filtered) node.visible(false);
      if (this.context.pageView.mode === "active-page") this.#isolateActivePageDrawOrder();
      if (this.context.transformer?.nodes().length) this.context.transformer.forceUpdate();
    }
  }

  getBounds(pageId: number): PageViewBounds | null {
    const bounds = this.#bounds.get(pageId);
    return bounds ? { ...bounds } : null;
  }
  getBlockOffset(blockId: number): { x: number; y: number } {
    const pageId = getOwningPageId(this.#lookup, blockId);
    const bounds = pageId === null ? undefined : this.#bounds.get(pageId);
    return { x: bounds?.x ?? 0, y: bounds?.y ?? 0 };
  }
  isContinuous(): boolean {
    const mode = this.context.pageView.mode;
    return mode === "vertical-pages" || mode === "horizontal-pages";
  }
  dispose(): void {
    this.#wrappers.dispose();
    this.#bounds.clear();
  }
  #applyNode(id: number, node: Konva.Node): void {
    const view = this.context.pageView;
    const owner = getOwningPageId(this.#lookup, id);
    const included =
      view.mode === "all-pages" ||
      (view.mode === "active-page"
        ? owner !== null && owner === view.activePageId
        : owner !== null && this.#bounds.has(owner));
    const wasFiltered = node.getAttr(FILTERED) === true;
    if (!included) {
      if (!wasFiltered) node.setAttr(RESTORE_VISIBLE, node.visible());
      node.setAttr(FILTERED, true);
      node.visible(false);
    } else if (wasFiltered) {
      node.visible(node.getAttr(RESTORE_VISIBLE) !== false);
      node.setAttr(FILTERED, false);
    }
  }

  #reconcilePageSize(): void {
    const view = this.context.pageView;
    if (view.mode === "vertical-pages" || view.mode === "horizontal-pages") {
      const layout = layoutContinuousPages(view.mode, view.pages);
      const first = view.pages[0];
      const last = view.pages[view.pages.length - 1];
      if (layout.width <= 0 || layout.height <= 0 || !first || !last) {
        this.context.lastPageSize = undefined;
        this.context.camera?.clearPageSize();
        return;
      }
      const range =
        view.mode === "vertical-pages"
          ? {
              minX: layout.width / 2,
              maxX: layout.width / 2,
              minY: first.height / 2,
              maxY: layout.height - last.height / 2,
            }
          : {
              minX: first.width / 2,
              maxX: layout.width - last.width / 2,
              minY: layout.height / 2,
              maxY: layout.height / 2,
            };
      this.context.lastPageSize = { width: layout.width, height: layout.height };
      const changed = this.context.camera?.setPageNavigationBounds(
        layout.width,
        layout.height,
        range,
      );
      if (changed) this.context.camera.reapplyViewport();
      return;
    }
    const size =
      view.mode === "active-page"
        ? view.activePageId === null
          ? undefined
          : this.context.pageSizes.get(view.activePageId)
        : this.context.legacyPageSize;
    if (size) this.#usePageSize(size);
  }
  #rebuildBounds(): void {
    this.#bounds.clear();
    const view = this.context.pageView;
    if (view.mode === "all-pages") {
      for (const [id, size] of this.context.pageSizes) {
        this.#bounds.set(id, { x: 0, y: 0, ...size });
      }
    } else if (view.mode === "active-page") {
      if (view.activePageId === null) return;
      const size = this.context.pageSizes.get(view.activePageId);
      if (size) this.#bounds.set(view.activePageId, { x: 0, y: 0, ...size });
    } else {
      this.#bounds = new Map(layoutContinuousPages(view.mode, view.pages).bounds);
    }
  }

  #isolateActivePageDrawOrder(): void {
    const view = this.context.pageView;
    if (view.mode !== "active-page" || view.activePageId === null) return;
    const pageNode = this.context.nodeMap.get(view.activePageId);
    if (pageNode && pageNode.zIndex() > 0) pageNode.moveToBottom();
  }

  #restoreLegacyPageDrawOrder(): void {
    const sceneIds = new Set<number>();
    for (const id of this.context.nodeMap.keys()) {
      const block = this.#lookup.get(id);
      if (block?.type === "page" && block.parentId !== null) sceneIds.add(block.parentId);
    }
    for (const sceneId of sceneIds) {
      const scene = this.#lookup.get(sceneId);
      if (scene?.type !== "scene") continue;
      for (const pageId of scene.children) {
        if (this.#lookup.get(pageId)?.type === "page") {
          this.context.nodeMap.get(pageId)?.moveToTop();
        }
      }
    }
  }

  #usePageSize(size: { width: number; height: number }): void {
    this.context.lastPageSize = size;
    this.context.camera?.setPageSize?.(size.width, size.height);
  }
}
