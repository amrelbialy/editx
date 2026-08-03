import type Konva from "konva";
import { clampPan, clampZoom, MAX_ZOOM, MIN_ZOOM } from "./konva-camera-clamp";

// Re-export the shared clamp bounds/helper so existing importers of KonvaCamera
// don't need to change their import path.
export { clampZoom, MAX_ZOOM, MIN_ZOOM };

/**
 * Manages viewport state: zoom, pan, fit-to-screen, and coordinate transforms.
 *
 * All zoom/pan mutations funnel through the single {@link KonvaCamera.#applyZoomPan}
 * entry point so clamping (zoom bounds + pan clamping) is applied consistently. No
 * public method sets `#zoom`/`#pan` directly.
 */
export class KonvaCamera {
  #stage: Konva.Stage;
  #contentLayer: Konva.Layer;
  #uiLayer: Konva.Layer;
  #zoom = 1;
  #pan = { x: 0, y: 0 };

  /** World-space page size used for pan clamping. */
  #pageSize: { width: number; height: number } | null = null;

  /** Active animation frame ID — non-null while an animated transition is in flight. */
  #animFrameId: number | null = null;

  /** Notified whenever the applied zoom changes, so UI overlays can rescale. */
  #onZoomChange?: (zoom: number) => void;

  /** Notified whenever the applied pan changes (any source, including animation). */
  #onPanChange?: (pan: { x: number; y: number }) => void;

  constructor(stage: Konva.Stage, contentLayer: Konva.Layer, uiLayer: Konva.Layer) {
    this.#stage = stage;
    this.#contentLayer = contentLayer;
    this.#uiLayer = uiLayer;
  }

  /** Store the page dimensions so pan clamping can keep the image in view. */
  setPageSize(width: number, height: number): void {
    this.#pageSize = { width, height };
  }

  /**
   * Register a listener invoked whenever the applied zoom factor changes.
   * Used to keep UI-overlay handle/stroke sizes screen-constant across zoom.
   */
  setZoomChangeListener(cb: (zoom: number) => void): void {
    this.#onZoomChange = cb;
  }

  /** Register a listener invoked whenever the applied pan changes. */
  setPanChangeListener(cb: (pan: { x: number; y: number }) => void): void {
    this.#onPanChange = cb;
  }

  setZoom(zoom: number, animate = false): void {
    // Adjust pan so the viewport center stays fixed in world-space.
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const cx = stageW / 2;
    const cy = stageH / 2;

    // World point currently at viewport center
    const worldX = (cx - this.#pan.x) / this.#zoom;
    const worldY = (cy - this.#pan.y) / this.#zoom;

    const nextZoom = clampZoom(zoom);
    const targetPan = {
      x: cx - worldX * nextZoom,
      y: cy - worldY * nextZoom,
    };

    if (animate) {
      this.#animateTo(nextZoom, targetPan);
    } else {
      this.#applyZoomPan(nextZoom, targetPan);
    }
  }

  /** Zoom centered on a specific screen point (e.g. mouse cursor position). */
  zoomAtPoint(zoom: number, screenPt: { x: number; y: number }): void {
    // World point under the cursor before zoom
    const worldX = (screenPt.x - this.#pan.x) / this.#zoom;
    const worldY = (screenPt.y - this.#pan.y) / this.#zoom;

    const nextZoom = clampZoom(zoom);
    this.#applyZoomPan(nextZoom, {
      x: screenPt.x - worldX * nextZoom,
      y: screenPt.y - worldY * nextZoom,
    });
  }

  getZoom(): number {
    return this.#zoom;
  }

  panTo(x: number, y: number): void {
    this.#applyZoomPan(this.#zoom, { x, y });
  }

  /** Pan by a screen-space delta relative to the current pan. */
  panBy(dx: number, dy: number): void {
    this.#applyZoomPan(this.#zoom, { x: this.#pan.x + dx, y: this.#pan.y + dy });
  }

  getPan(): { x: number; y: number } {
    return { ...this.#pan };
  }

  /**
   * Re-apply the current zoom/pan through the clamping path. Call after the
   * stage size changes (e.g. container resize) so pan stays within bounds
   * without resetting the user's viewport.
   */
  reapplyViewport(): void {
    this.#applyZoomPan(this.#zoom, this.#pan);
  }

  fitToScreen(opts: { width: number; height: number; padding: number }, animate = false): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - opts.padding * 2) / opts.width;
    const scaleY = (stageH - opts.padding * 2) / opts.height;
    const scale = clampZoom(Math.min(scaleX, scaleY));

    const targetPan = {
      x: (stageW - opts.width * scale) / 2,
      y: (stageH - opts.height * scale) / 2,
    };

    if (animate) {
      this.#animateTo(scale, targetPan);
    } else {
      this.#applyZoomPan(scale, targetPan);
    }
  }

  centerOnRect(
    rect: { x: number; y: number; width: number; height: number },
    animate = false,
  ): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const targetPan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * this.#zoom,
      y: stageH / 2 - (rect.y + rect.height / 2) * this.#zoom,
    };

    if (animate) {
      this.#animateTo(this.#zoom, targetPan);
    } else {
      this.#applyZoomPan(this.#zoom, targetPan);
    }
  }

  /**
   * Zoom and pan so that the given world-space rectangle fills the viewport
   * with the specified padding.
   */
  fitToRect(
    rect: { x: number; y: number; width: number; height: number },
    padding = 24,
    animate = false,
  ): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - padding * 2) / rect.width;
    const scaleY = (stageH - padding * 2) / rect.height;
    const scale = clampZoom(Math.min(scaleX, scaleY));

    const targetPan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * scale,
      y: stageH / 2 - (rect.y + rect.height / 2) * scale,
    };

    if (animate) {
      this.#animateTo(scale, targetPan);
    } else {
      this.#applyZoomPan(scale, targetPan);
    }
  }

  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (pt.x - this.#pan.x) / this.#zoom,
      y: (pt.y - this.#pan.y) / this.#zoom,
    };
  }

  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return {
      x: pt.x * this.#zoom + this.#pan.x,
      y: pt.y * this.#zoom + this.#pan.y,
    };
  }

  /**
   * Clamp pan so the page stays centered when it fits in the viewport,
   * or can't be panned past its edges when zoomed in.
   */
  #clampPan(): void {
    this.#pan = clampPan(this.#pan, {
      stageW: this.#stage.width(),
      stageH: this.#stage.height(),
      zoom: this.#zoom,
      pageSize: this.#pageSize,
    });
  }

  /**
   * Single clamped entry point for every zoom/pan mutation. Clamps zoom to
   * [MIN_ZOOM, MAX_ZOOM], applies the pan, then clamps pan to keep the page in
   * view, and finally commits to the Konva layers.
   */
  #applyZoomPan(zoom: number, pan: { x: number; y: number }): void {
    this.#zoom = clampZoom(zoom);
    this.#pan = { ...pan };
    this.#clampPan();
    this.#applyCamera();
  }

  #applyCamera(): void {
    this.#contentLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#contentLayer.position(this.#pan);
    this.#uiLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#uiLayer.position(this.#pan);
    if (this.#zoom !== this.#lastNotifiedZoom) {
      this.#lastNotifiedZoom = this.#zoom;
      this.#onZoomChange?.(this.#zoom);
    }
    if (this.#pan.x !== this.#lastNotifiedPan.x || this.#pan.y !== this.#lastNotifiedPan.y) {
      this.#lastNotifiedPan = { x: this.#pan.x, y: this.#pan.y };
      this.#onPanChange?.({ ...this.#pan });
    }
    this.#stage.batchDraw();
  }

  /** Last zoom value forwarded to {@link #onZoomChange}, to avoid redundant rescales. */
  #lastNotifiedZoom = 1;

  /** Last pan value forwarded to {@link #onPanChange}, to avoid redundant emits. */
  #lastNotifiedPan = { x: 0, y: 0 };

  // ─── Animation ──────────────────────────────────────────

  static readonly ANIM_DURATION = 200; // ms

  /**
   * Smoothly animate zoom + pan to target values using ease-out cubic.
   * Cancels any in-flight animation so rapid clicks feel responsive.
   */
  #animateTo(targetZoom: number, targetPan: { x: number; y: number }): void {
    // Cancel any running animation
    if (this.#animFrameId !== null) {
      cancelAnimationFrame(this.#animFrameId);
      this.#animFrameId = null;
    }

    const startZoom = this.#zoom;
    const startPan = { ...this.#pan };
    const startTime = performance.now();
    const duration = KonvaCamera.ANIM_DURATION;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: 1 - (1 - t)^3
      const t = 1 - (1 - progress) ** 3;

      const nextZoom = startZoom + (targetZoom - startZoom) * t;
      const nextPan = {
        x: startPan.x + (targetPan.x - startPan.x) * t,
        y: startPan.y + (targetPan.y - startPan.y) * t,
      };
      this.#applyZoomPan(nextZoom, nextPan);

      if (progress < 1) {
        this.#animFrameId = requestAnimationFrame(tick);
      } else {
        this.#animFrameId = null;
      }
    };

    this.#animFrameId = requestAnimationFrame(tick);
  }
}
