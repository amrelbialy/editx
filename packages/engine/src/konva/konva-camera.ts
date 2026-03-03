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

  constructor(stage: Konva.Stage, contentLayer: Konva.Layer, uiLayer: Konva.Layer) {
    this.#stage = stage;
    this.#contentLayer = contentLayer;
    this.#uiLayer = uiLayer;
  }

  setZoom(zoom: number): void {
    this.#zoom = zoom;
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

  fitToScreen(opts: { width: number; height: number; padding: number }): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - opts.padding * 2) / opts.width;
    const scaleY = (stageH - opts.padding * 2) / opts.height;
    const scale = Math.min(scaleX, scaleY);

    this.#zoom = scale;
    this.#pan = {
      x: (stageW - opts.width * scale) / 2,
      y: (stageH - opts.height * scale) / 2,
    };
    this.#applyCamera();
  }

  centerOnRect(rect: { x: number; y: number; width: number; height: number }): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    this.#pan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * this.#zoom,
      y: stageH / 2 - (rect.y + rect.height / 2) * this.#zoom,
    };
    this.#applyCamera();
  }

  /**
   * Zoom and pan so that the given world-space rectangle fills the viewport
   * with the specified padding.
   */
  fitToRect(rect: { x: number; y: number; width: number; height: number }, padding = 24): void {
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - padding * 2) / rect.width;
    const scaleY = (stageH - padding * 2) / rect.height;
    const scale = Math.min(scaleX, scaleY);

    this.#zoom = scale;
    this.#pan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * scale,
      y: stageH / 2 - (rect.y + rect.height / 2) * scale,
    };
    this.#applyCamera();
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

  #applyCamera(): void {
    this.#contentLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#contentLayer.position(this.#pan);
    this.#uiLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#uiLayer.position(this.#pan);
    this.#stage.batchDraw();
  }
}
