import Konva from 'konva';

/**
 * Manages viewport state: zoom, pan, fit-to-screen, and coordinate transforms.
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

  constructor(stage: Konva.Stage, contentLayer: Konva.Layer, uiLayer: Konva.Layer) {
    this.#stage = stage;
    this.#contentLayer = contentLayer;
    this.#uiLayer = uiLayer;
  }

  /** Store the page dimensions so pan clamping can keep the image in view. */
  setPageSize(width: number, height: number): void {
    this.#pageSize = { width, height };
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

    const targetPan = {
      x: cx - worldX * zoom,
      y: cy - worldY * zoom,
    };

    if (animate) {
      this.#animateTo(zoom, targetPan);
    } else {
      this.#zoom = zoom;
      this.#pan = targetPan;
      this.#applyCamera();
    }
  }

  /** Zoom centered on a specific screen point (e.g. mouse cursor position). */
  zoomAtPoint(zoom: number, screenPt: { x: number; y: number }): void {
    // World point under the cursor before zoom
    const worldX = (screenPt.x - this.#pan.x) / this.#zoom;
    const worldY = (screenPt.y - this.#pan.y) / this.#zoom;

    this.#zoom = zoom;
    this.#pan = {
      x: screenPt.x - worldX * zoom,
      y: screenPt.y - worldY * zoom,
    };
    this.#clampPan();
    this.#applyCamera();
  }

  getZoom(): number {
    return this.#zoom;
  }

  panTo(x: number, y: number): void {
    this.#pan = { x, y };
    this.#applyCamera();
  }

  getPan(): { x: number; y: number } {
    return { ...this.#pan };
  }

  fitToScreen(opts: { width: number; height: number; padding: number }, animate = false): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - opts.padding * 2) / opts.width;
    const scaleY = (stageH - opts.padding * 2) / opts.height;
    const scale = Math.min(scaleX, scaleY);

    const targetPan = {
      x: (stageW - opts.width * scale) / 2,
      y: (stageH - opts.height * scale) / 2,
    };

    if (animate) {
      this.#animateTo(scale, targetPan);
    } else {
      this.#zoom = scale;
      this.#pan = targetPan;
      this.#applyCamera();
    }
  }

  centerOnRect(rect: { x: number; y: number; width: number; height: number }, animate = false): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const targetPan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * this.#zoom,
      y: stageH / 2 - (rect.y + rect.height / 2) * this.#zoom,
    };

    if (animate) {
      this.#animateTo(this.#zoom, targetPan);
    } else {
      this.#pan = targetPan;
      this.#applyCamera();
    }
  }

  /**
   * Zoom and pan so that the given world-space rectangle fills the viewport
   * with the specified padding.
   */
  fitToRect(rect: { x: number; y: number; width: number; height: number }, padding = 24, animate = false): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - padding * 2) / rect.width;
    const scaleY = (stageH - padding * 2) / rect.height;
    const scale = Math.min(scaleX, scaleY);

    const targetPan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * scale,
      y: stageH / 2 - (rect.y + rect.height / 2) * scale,
    };

    if (animate) {
      this.#animateTo(scale, targetPan);
    } else {
      this.#zoom = scale;
      this.#pan = targetPan;
      this.#applyCamera();
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
    if (!this.#pageSize) return;

    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const pageScreenW = this.#pageSize.width * this.#zoom;
    const pageScreenH = this.#pageSize.height * this.#zoom;

    // Horizontal: if page narrower than viewport, center it; otherwise clamp edges
    if (pageScreenW <= stageW) {
      this.#pan.x = (stageW - pageScreenW) / 2;
    } else {
      const minX = stageW - pageScreenW;
      const maxX = 0;
      this.#pan.x = Math.min(maxX, Math.max(minX, this.#pan.x));
    }

    // Vertical: same logic
    if (pageScreenH <= stageH) {
      this.#pan.y = (stageH - pageScreenH) / 2;
    } else {
      const minY = stageH - pageScreenH;
      const maxY = 0;
      this.#pan.y = Math.min(maxY, Math.max(minY, this.#pan.y));
    }
  }

  #applyCamera(): void {
    this.#contentLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#contentLayer.position(this.#pan);
    this.#uiLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#uiLayer.position(this.#pan);
    this.#stage.batchDraw();
  }

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
      const t = 1 - Math.pow(1 - progress, 3);

      this.#zoom = startZoom + (targetZoom - startZoom) * t;
      this.#pan = {
        x: startPan.x + (targetPan.x - startPan.x) * t,
        y: startPan.y + (targetPan.y - startPan.y) * t,
      };
      this.#applyCamera();

      if (progress < 1) {
        this.#animFrameId = requestAnimationFrame(tick);
      } else {
        this.#animFrameId = null;
      }
    };

    this.#animFrameId = requestAnimationFrame(tick);
  }
}
