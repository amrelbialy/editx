import Konva from "konva";
import type { PageViewBounds, RendererPageViewPage } from "../page-view";
import type { KonvaRendererContext } from "./konva-renderer-context";

const WRAPPER_PAGE_ID = "pageViewPageId";

/** Owns transient layout groups without exposing their offsets to document nodes. */
export class KonvaPageWrappers {
  readonly #wrappers = new Map<number, Konva.Group>();

  constructor(private readonly context: KonvaRendererContext) {}

  apply(pages: readonly RendererPageViewPage[], bounds: ReadonlyMap<number, PageViewBounds>): void {
    const presented = new Set(pages.map((page) => page.id));
    for (const [pageId, wrapper] of this.#wrappers) {
      if (!presented.has(pageId)) this.#removeWrapper(pageId, wrapper);
    }

    for (const page of pages) {
      const frame = bounds.get(page.id);
      if (!frame) continue;
      const wrapper = this.#ensureWrapper(page.id);
      wrapper.position({ x: frame.x, y: frame.y });
      this.#adoptPageRoots(page.id, wrapper);
      this.#orderPage(page.id, wrapper);
      wrapper.moveToTop();
    }
  }

  unwrap(): void {
    for (const [pageId, wrapper] of [...this.#wrappers]) {
      this.#removeWrapper(pageId, wrapper);
    }
  }

  syncRoot(pageId: number, node: Konva.Node, frame: PageViewBounds): void {
    const wrapper = this.#ensureWrapper(pageId);
    wrapper.position({ x: frame.x, y: frame.y });
    if (node.getParent() !== wrapper) node.moveTo(wrapper);
    this.#orderPage(pageId, wrapper);
  }

  dispose(): void {
    this.unwrap();
  }

  static pageIdFromNode(node: Konva.Node): number | null {
    let current: Konva.Node | null = node;
    while (current) {
      const pageId = current.getAttr(WRAPPER_PAGE_ID);
      if (typeof pageId === "number") return pageId;
      if (current.getAttr("isPage")) {
        const blockId = current.getAttr("blockId");
        return typeof blockId === "number" ? blockId : null;
      }
      current = current.getParent();
    }
    return null;
  }

  #ensureWrapper(pageId: number): Konva.Group {
    let wrapper = this.#wrappers.get(pageId);
    if (wrapper) return wrapper;
    wrapper = new Konva.Group({ name: `page-view-${pageId}` });
    wrapper.setAttr(WRAPPER_PAGE_ID, pageId);
    this.context.contentLayer.add(wrapper);
    this.#wrappers.set(pageId, wrapper);
    return wrapper;
  }

  #adoptPageRoots(pageId: number, wrapper: Konva.Group): void {
    for (const [id, node] of this.context.nodeMap) {
      const block = this.context.callbacks.resolveBlock?.(id);
      if (!block) continue;
      const isPage = id === pageId && block.type === "page";
      const parent =
        block.parentId === null ? undefined : this.context.callbacks.resolveBlock?.(block.parentId);
      if (
        (isPage || (parent?.type === "page" && parent.id === pageId)) &&
        node.getParent() !== wrapper
      ) {
        node.moveTo(wrapper);
      }
    }
  }

  #orderPage(pageId: number, wrapper: Konva.Group): void {
    const pageNode = this.context.nodeMap.get(pageId);
    if (pageNode?.getParent() === wrapper) pageNode.moveToBottom();
    const page = this.context.callbacks.resolveBlock?.(pageId);
    if (page?.type !== "page") return;
    for (const childId of page.children) {
      const child = this.context.nodeMap.get(childId);
      if (child?.getParent() === wrapper) child.moveToTop();
    }
  }

  #removeWrapper(pageId: number, wrapper: Konva.Group): void {
    for (const child of [...wrapper.getChildren()]) child.moveTo(this.context.contentLayer);
    wrapper.destroy();
    this.#wrappers.delete(pageId);
  }
}
