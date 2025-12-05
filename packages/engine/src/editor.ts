import { Engine } from './engine';
import { RendererAdapter } from './render-adapter';

export class EditorAPI {
  #engine: Engine;
  #renderer: RendererAdapter | null;

  constructor(engine: Engine) {
    this.#engine = engine;
    this.#renderer = engine.getRenderer();
  }

  //
  // -----------------------------
  // HISTORY
  // -----------------------------
  //

  undo() {
    this.#engine.undo();
  }

  redo() {
    this.#engine.redo();
  }

  canUndo() {
    return this.#engine.canUndo();
  }

  canRedo() {
    return this.#engine.canRedo();
  }

  clearHistory() {
    this.#engine.clearHistory();
  }

  //
  // -----------------------------
  // SELECTION
  // -----------------------------
  //

  setSelection(ids: string[]) {
    this.#engine.setSelection(ids);
  }

  getSelection(): string[] {
    return this.#engine.getSelection();
  }

  clearSelection() {
    this.#engine.setSelection([]);
  }

  //
  // -----------------------------
  // VIEWPORT / CAMERA
  // (img.ly style)
  // -----------------------------
  //

  setZoom(zoom: number) {
    this.#renderer?.setZoom(zoom);
  }

  getZoom(): number {
    return this.#renderer?.getZoom() ?? 1;
  }

  zoomIn(step = 0.1) {
    const z = this.getZoom();
    this.setZoom(z + step);
  }

  zoomOut(step = 0.1) {
    const z = this.getZoom();
    this.setZoom(Math.max(0.1, z - step));
  }

  resetZoom() {
    this.setZoom(1);
  }

  panTo(x: number, y: number) {
    this.#renderer?.panTo(x, y);
  }

  panBy(dx: number, dy: number) {
    const { x, y } = this.#renderer?.getPan() ?? { x: 0, y: 0 };
    this.#renderer?.panTo(x + dx, y + dy);
  }

  //
  // -----------------------------
  // FITTING / CENTERING
  // -----------------------------
  //

  fitToScreen(padding = 24) {
    const scene = this.#engine.getDocument().scene;

    this.#renderer?.fitToScreen({
      width: scene.width,
      height: scene.height,
      padding,
    });
  }

  centerOnLayer(layerId: string) {
    const doc = this.#engine.getDocument();
    const layer = doc.layers[layerId];

    if (!layer) return;

    this.#renderer?.centerOnRect({
      x: layer.transform.x,
      y: layer.transform.y,
      width: layer.props.width,
      height: layer.props.height,
    });
  }

  //
  // -----------------------------
  // COORDINATE TRANSFORMS
  // -----------------------------
  //

  screenToWorld(pt: { x: number; y: number }) {
    return this.#renderer?.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }) {
    return this.#renderer?.worldToScreen(pt);
  }

  //
  // -----------------------------
  // VIEWPORT INFO
  // -----------------------------
  //

  getViewport() {
    return this.#renderer?.getViewport();
  }
}
