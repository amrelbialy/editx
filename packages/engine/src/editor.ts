import { Engine } from './engine';
import { RendererAdapter } from './render-adapter';

export class EditorAPI {
  #engine: Engine;
  #renderer: RendererAdapter | null;

  constructor(engine: Engine) {
    this.#engine = engine;
    this.#renderer = engine.getRenderer();
  }

  // --- History ---

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

  // --- Selection ---

  setSelection(ids: number[]) {
    this.#engine.setSelection(ids);
  }

  getSelection(): number[] {
    return this.#engine.getSelection();
  }

  clearSelection() {
    this.#engine.setSelection([]);
  }

  // --- Viewport / Camera ---

  setZoom(zoom: number) {
    this.#renderer?.setZoom(zoom);
  }

  getZoom(): number {
    return this.#renderer?.getZoom() ?? 1;
  }

  zoomIn(step = 0.1) {
    this.setZoom(this.getZoom() + step);
  }

  zoomOut(step = 0.1) {
    this.setZoom(Math.max(0.1, this.getZoom() - step));
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

  getPan(): { x: number; y: number } {
    return this.#renderer?.getPan() ?? { x: 0, y: 0 };
  }

  // --- Fitting / Centering ---

  fitToScreen(padding = 24) {
    const store = this.#engine.getBlockStore();
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return;

    const sceneBlock = store.get(sceneId);
    if (!sceneBlock) return;

    this.#renderer?.fitToScreen({
      width: (sceneBlock.properties['scene/width'] as number) ?? 1080,
      height: (sceneBlock.properties['scene/height'] as number) ?? 1080,
      padding,
    });
  }

  // --- Coordinate Transforms ---

  screenToWorld(pt: { x: number; y: number }) {
    return this.#renderer?.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }) {
    return this.#renderer?.worldToScreen(pt);
  }
}
