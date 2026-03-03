import type { EditorContext } from './editor-context';
import { PAGE_WIDTH, PAGE_HEIGHT } from '../block/property-keys';

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

  setZoom(zoom: number): void {
    this.#ctx.renderer?.setZoom(zoom);
  }

  getZoom(): number {
    return this.#ctx.renderer?.getZoom() ?? 1;
  }

  zoomIn(step = 0.1): void {
    this.setZoom(this.getZoom() + step);
  }

  zoomOut(step = 0.1): void {
    this.setZoom(Math.max(0.1, this.getZoom() - step));
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
  fitToScreen(padding = 24): void {
    const store = this.#ctx.engine.getBlockStore();
    const pageId = this.#ctx.engine.getActivePage();
    if (pageId === null) return;

    const pageBlock = store.get(pageId);
    if (!pageBlock) return;

    this.#ctx.renderer?.fitToScreen({
      width: (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080,
      height: (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080,
      padding,
    });
  }

  // ─── Coordinate Transforms ────────────────────────────

  screenToWorld(pt: { x: number; y: number }) {
    return this.#ctx.renderer?.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }) {
    return this.#ctx.renderer?.worldToScreen(pt);
  }
}
