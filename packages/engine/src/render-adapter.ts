export interface RendererAdapter {
  //
  // Initialization
  //
  init(options: { root: HTMLElement }): Promise<void>;

  //
  // Layer lifecycle
  //
  createLayer(id: string, layer: any): void;
  updateLayer(id: string, layer: any): void;
  removeLayer(id: string): void;

  //
  // Camera / viewport operations
  //
  setZoom(zoom: number): void;
  getZoom(): number;

  panTo(x: number, y: number): void;
  getPan(): { x: number; y: number };

  fitToScreen(opts: { width: number; height: number; padding: number }): void;

  centerOnRect(rect: { x: number; y: number; width: number; height: number }): void;

  //
  // Coordinate transforms
  //
  screenToWorld(pt: { x: number; y: number }): { x: number; y: number };
  worldToScreen(pt: { x: number; y: number }): { x: number; y: number };

  //
  // Render
  //
  renderFrame(): void;

  //
  // Cleanup
  //
  dispose(): void;
}
