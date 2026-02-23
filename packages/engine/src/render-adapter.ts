import { BlockData } from './block/block.types';

export interface RendererAdapter {
  //
  // Initialization
  //
  init(root: HTMLElement): Promise<void>;

  //
  // Scene setup
  //
  createScene(sceneBlock: BlockData, pageBlock: BlockData): Promise<void>;

  //
  // Block lifecycle
  //
  syncBlock(id: number, block: BlockData): void;
  removeBlock(id: number): void;

  //
  // Transformer
  //
  showTransformer(blockIds: number[]): void;
  hideTransformer(): void;

  //
  // Camera / viewport
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

  //
  // Interaction callbacks (renderer → engine)
  //
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (blockId: number, transform: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
}
