import { BlockData } from './block/block.types';
import type { CursorType } from './editor-types';
import type { CropRect } from './utils/crop-math';

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
  fitToRect(rect: { x: number; y: number; width: number; height: number }, padding?: number): void;
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
  // Cursor
  //
  /** Update the rendered cursor. Optional — not all adapters manage cursors. */
  setCursor?(type: CursorType): void;

  //
  // Crop overlay
  //
  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: { rotation: number; flipH: boolean; flipV: boolean; sourceWidth: number; sourceHeight: number },
  ): void;
  hideCropOverlay(): void;
  setCropRect(rect: CropRect): void;
  setCropRatio(ratio: number | null): void;
  getCropRect(): CropRect | null;
  getCropImageRect(): CropRect | null;

  //
  // Interaction callbacks (renderer → engine)
  //
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDblClick?: (blockId: number) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (blockId: number, transform: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  /** Called when the user drags/resizes the crop overlay. */
  onCropChange?: (rect: CropRect) => void;
}
