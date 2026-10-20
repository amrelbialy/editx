import { absoluteTransformOf } from "../block/block-group-api";
import { rotatedUnionBBox } from "../block/group-transform";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import { getOwningPageId } from "../page-view-ownership";
import type { EditorContext } from "./editor-context";

/**
 * Viewport / camera management: zoom, pan, fitting, and coordinate transforms.
 * Operates on the shared EditorContext.
 */
export class EditorViewport {
  #ctx: EditorContext;

  constructor(ctx: EditorContext) {
    this.#ctx = ctx;
  }

  // ─── Zoom ─────────────────────────────────────────────

  setZoom(zoom: number, animate = false): void {
    this.#ctx.renderer?.setZoom(zoom, animate);
  }

  getZoom(): number {
    return this.#ctx.renderer?.getZoom() ?? 1;
  }

  zoomIn(step = 0.1): void {
    this.setZoom(this.getZoom() + step);
  }

  zoomOut(step = 0.1): void {
    // Zoom bounds are clamped by the camera (single source of truth); no local clamp.
    this.setZoom(this.getZoom() - step);
  }

  resetZoom(): void {
    this.setZoom(1);
  }

  // ─── Pan ──────────────────────────────────────────────

  panTo(x: number, y: number): void {
    this.#ctx.renderer?.panTo(x, y);
  }

  panBy(dx: number, dy: number): void {
    const { x, y } = this.#ctx.renderer?.getPan() ?? { x: 0, y: 0 };
    this.#ctx.renderer?.panTo(x + dx, y + dy);
  }

  getPan(): { x: number; y: number } {
    return this.#ctx.renderer?.getPan() ?? { x: 0, y: 0 };
  }

  // ─── Fitting / Centering ──────────────────────────────

  /**
   * Fit the camera to show the active page, with optional padding.
   */
  fitToScreen(padding = 24, animate = false): void {
    const store = this.#ctx.engine._getBlockStore();
    const pageId = this.#ctx.engine.getActivePage();
    if (pageId === null) return;

    const pageBlock = store.get(pageId);
    if (!pageBlock) return;
    const bounds = this.#ctx.renderer?.getPageViewBounds?.(pageId);
    if (bounds && (bounds.x !== 0 || bounds.y !== 0)) {
      this.#ctx.renderer?.fitToRect(bounds, padding, animate);
      return;
    }

    this.#ctx.renderer?.fitToScreen(
      {
        width: (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080,
        height: (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080,
        padding,
      },
      animate,
    );
  }

  /**
   * Fit the camera to show the currently selected blocks, with optional padding.
   * No-op if nothing is selected.
   */
  fitToSelection(padding = 24, animate = false): void {
    const block = this.#ctx.block;
    if (!block) return;

    const ids = block.findAllSelected();
    if (ids.length === 0) return;

    const store = this.#ctx.engine._getBlockStore();
    const rects = ids.map((id) => {
      const renderer = this.#ctx.renderer;
      const screenRect = renderer?.getBlockScreenRect(id);
      if (renderer && screenRect) {
        const origin = renderer.screenToWorld(screenRect);
        const end = renderer.screenToWorld({
          x: screenRect.x + screenRect.width,
          y: screenRect.y + screenRect.height,
        });
        return {
          ...origin,
          width: end.x - origin.x,
          height: end.y - origin.y,
          rotation: 0,
        };
      }
      const transform = absoluteTransformOf(store, id);
      const size = block.getSize(id);
      const pageId = getOwningPageId(store, id);
      const bounds =
        pageId === null ? null : (this.#ctx.renderer?.getPageViewBounds?.(pageId) ?? null);
      return {
        ...transform,
        ...size,
        x: transform.x + (bounds?.x ?? 0),
        y: transform.y + (bounds?.y ?? 0),
      };
    });
    this.#ctx.renderer?.fitToRect(rotatedUnionBBox(rects), padding, animate);
  }

  // ─── Coordinate Transforms ────────────────────────────

  screenToWorld(pt: { x: number; y: number }) {
    return this.#ctx.renderer?.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }) {
    return this.#ctx.renderer?.worldToScreen(pt);
  }
}
