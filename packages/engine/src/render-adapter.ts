import type { BlockData } from "./block/block.types";
import type { CursorType, ExportOptions } from "./editor-types";
import type { CropRect } from "./utils/crop-math";

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

  /** Reorder child Konva nodes to match the given child ID order (bottom→top). */
  syncChildOrder?(childIds: number[]): void;

  //
  // Transformer
  //
  showTransformer(blockIds: number[], blockType?: string): void;
  hideTransformer(): void;
  /** Returns the screen-pixel bounding rect of the current transformer selection, or null. */
  getSelectedBlockScreenRect(): { x: number; y: number; width: number; height: number } | null;
  /** Returns the screen-pixel bounding rect of a specific block node, or null. */
  getBlockScreenRect(
    blockId: number,
  ): { x: number; y: number; width: number; height: number } | null;

  //
  // Camera / viewport
  //
  setZoom(zoom: number, animate?: boolean): void;
  getZoom(): number;

  panTo(x: number, y: number): void;
  getPan(): { x: number; y: number };

  fitToScreen(opts: { width: number; height: number; padding: number }, animate?: boolean): void;
  fitToRect(
    rect: { x: number; y: number; width: number; height: number },
    padding?: number,
    animate?: boolean,
  ): void;
  centerOnRect(
    rect: { x: number; y: number; width: number; height: number },
    animate?: boolean,
  ): void;

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
  // Export
  //
  /** Render the current page to an offscreen canvas and return the result as a Blob. */
  exportScene(options: ExportOptions): Promise<Blob>;

  //
  // Cleanup
  //
  dispose(): void;

  //
  // Cursor
  //
  /** Update the rendered cursor. Optional — not all adapters manage cursors. */
  setCursor?(type: CursorType): void;

  /** Update the accent color used by the transformer and selection UI. */
  setAccentColor?(color: string): void;

  //
  // Crop overlay
  //
  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: {
      rotation: number;
      flipH: boolean;
      flipV: boolean;
      sourceWidth: number;
      sourceHeight: number;
    },
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
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  /** Called when the user drags/resizes the crop overlay. */
  onCropChange?: (rect: CropRect) => void;
}
