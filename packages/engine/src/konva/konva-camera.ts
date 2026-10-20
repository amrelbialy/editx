import type Konva from "konva";
import { KonvaCameraAnimation } from "./konva-camera-animation";
import {
  type CameraCenterRange,
  type CameraPageBounds,
  clampPan,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./konva-camera-clamp";

export { clampZoom, MAX_ZOOM, MIN_ZOOM };

export class KonvaCamera {
  #stage: Konva.Stage;
  #contentLayer: Konva.Layer;
  #uiLayer: Konva.Layer;
  #zoom = 1;
  #pan = { x: 0, y: 0 };
  #pageSize: CameraPageBounds | null = null;
  #animation = new KonvaCameraAnimation();
  #initialResizeSize: { width: number; height: number } | null = null;
  #onZoomChange?: (zoom: number) => void;
  #onPanChange?: (pan: { x: number; y: number }) => void;
  constructor(stage: Konva.Stage, contentLayer: Konva.Layer, uiLayer: Konva.Layer) {
    this.#stage = stage;
    this.#contentLayer = contentLayer;
    this.#uiLayer = uiLayer;
  }

  setPageSize(width: number, height: number): void {
    this.#pageSize = { width, height };
  }
  setPageNavigationBounds(width: number, height: number, range: CameraCenterRange): boolean {
    const current = this.#pageSize;
    const prior = current?.centerRange;
    const changed =
      current?.width !== width ||
      current?.height !== height ||
      !prior ||
      prior.minX !== range.minX ||
      prior.maxX !== range.maxX ||
      prior.minY !== range.minY ||
      prior.maxY !== range.maxY;
    this.#pageSize = { width, height, centerRange: { ...range } };
    return changed;
  }

  clearPageSize(): void {
    this.#pageSize = null;
  }
  dispose(): void {
    this.#animation.cancel();
    this.#initialResizeSize = null;
    this.#onZoomChange = undefined;
    this.#onPanChange = undefined;
  }

  preserveCenterOnNextResize(): void {
    this.#initialResizeSize = { width: this.#stage.width(), height: this.#stage.height() };
  }

  completeResize(): void {
    this.#initialResizeSize = null;
  }
  setZoomChangeListener(cb: (zoom: number) => void): void {
    this.#onZoomChange = cb;
  }

  setPanChangeListener(cb: (pan: { x: number; y: number }) => void): void {
    this.#onPanChange = cb;
  }

  setZoom(zoom: number, animate = false): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const cx = stageW / 2;
    const cy = stageH / 2;

    const worldX = (cx - this.#pan.x) / this.#zoom;
    const worldY = (cy - this.#pan.y) / this.#zoom;

    const nextZoom = clampZoom(zoom);
    const targetPan = {
      x: cx - worldX * nextZoom,
      y: cy - worldY * nextZoom,
    };

    this.#applyTarget(nextZoom, targetPan, animate);
  }

  zoomAtPoint(zoom: number, screenPt: { x: number; y: number }): void {
    const worldX = (screenPt.x - this.#pan.x) / this.#zoom;
    const worldY = (screenPt.y - this.#pan.y) / this.#zoom;

    const nextZoom = clampZoom(zoom);
    this.#applyImmediately(nextZoom, {
      x: screenPt.x - worldX * nextZoom,
      y: screenPt.y - worldY * nextZoom,
    });
  }

  getZoom(): number {
    return this.#zoom;
  }

  panTo(x: number, y: number): void {
    this.#applyImmediately(this.#zoom, { x, y });
  }

  panBy(dx: number, dy: number): void {
    this.#applyImmediately(this.#zoom, { x: this.#pan.x + dx, y: this.#pan.y + dy });
  }

  getPan(): { x: number; y: number } {
    return { ...this.#pan };
  }

  reapplyViewport(): void {
    const initial = this.#initialResizeSize;
    const width = this.#stage.width();
    const height = this.#stage.height();
    const resized = initial !== null && (initial.width !== width || initial.height !== height);
    if (resized) this.#initialResizeSize = null;
    this.#applyImmediately(
      this.#zoom,
      resized
        ? {
            x: this.#pan.x + (width - initial.width) / 2,
            y: this.#pan.y + (height - initial.height) / 2,
          }
        : this.#pan,
    );
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

    this.#applyTarget(scale, targetPan, animate);
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

    this.#applyTarget(this.#zoom, targetPan, animate);
  }

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

    this.#applyTarget(scale, targetPan, animate);
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

  #clampPan(): void {
    this.#pan = clampPan(this.#pan, {
      stageW: this.#stage.width(),
      stageH: this.#stage.height(),
      zoom: this.#zoom,
      pageSize: this.#pageSize,
    });
  }

  #applyZoomPan(zoom: number, pan: { x: number; y: number }): void {
    this.#zoom = clampZoom(zoom);
    this.#pan = { ...pan };
    this.#clampPan();
    this.#applyCamera();
  }

  #applyImmediately(zoom: number, pan: { x: number; y: number }): void {
    this.#animation.cancel();
    this.#applyZoomPan(zoom, pan);
  }

  #applyTarget(zoom: number, pan: { x: number; y: number }, animate: boolean): void {
    if (animate) this.#animateTo(zoom, pan);
    else this.#applyImmediately(zoom, pan);
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

  #lastNotifiedZoom = 1;
  #lastNotifiedPan = { x: 0, y: 0 };

  #animateTo(targetZoom: number, targetPan: { x: number; y: number }): void {
    this.#animation.start(
      { zoom: this.#zoom, pan: this.#pan },
      { zoom: targetZoom, pan: targetPan },
      ({ zoom, pan }) => this.#applyZoomPan(zoom, pan),
    );
  }
}
