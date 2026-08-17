import type { BlockData } from "./block/block.types";
import type { BlockExportOptions, CursorType, ExportOptions } from "./editor-types";
import type { CropRect } from "./utils/crop-math";

/**
 * Payload for a block-click interaction reported by the renderer.
 * `additive` marks marquee/multi-select clicks that should only ever add to the
 * current selection (never toggle/remove), distinct from a plain shift-click.
 */
export interface BlockClickEvent {
  shiftKey: boolean;
  additive?: boolean;
  /** True when the resolved block lies within the active group context. */
  insideContext?: boolean;
}

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

  /**
   * Apply the active group-context stack (outermost-first). Drives the
   * draggable-scoping, dimming, and dashed-outline affordance in the renderer.
   */
  setGroupContext?(stack: number[]): void;

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
  /** @internal Full local-to-screen affine transform for DOM editing overlays. */
  getBlockScreenTransform?(
    blockId: number,
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null;

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
  /** Render one block subtree into a transparent, centered PNG. */
  exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob>;

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
  /**
   * Temporarily offset child block nodes while the crop overlay is active so
   * they stay anchored to the full image being shown (the overlay expands the
   * page node to the full original image, moving the page origin). The offset
   * is visual-only and is undone when children are re-synced on teardown.
   */
  offsetCropChildNodes?(childIds: number[], dx: number, dy: number): void;
  setCropRect(rect: CropRect): void;
  setCropRatio(ratio: number | null): void;
  getCropRect(): CropRect | null;
  getCropImageRect(): CropRect | null;

  //
  // Interaction callbacks (renderer → engine)
  //
  onBlockClick?: (blockId: number, event: BlockClickEvent) => void;
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  /** Called on a double-click that should descend into a group (child under cursor, if any). */
  onEnterGroup?: (groupId: number, childId: number | null) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  /** Called when the user drags/resizes the crop overlay. */
  onCropChange?: (rect: CropRect) => void;
  /**
   * Called on every frame while a block is being dragged or resized on-canvas
   * (live, before the gesture is committed). Lets consumers track a block's
   * geometry without polling.
   */
  onBlockTransform?: (blockId: number, phase: "drag" | "resize") => void;
  /**
   * Called whenever the camera pan changes (programmatic pan, zoom
   * re-centering, fit, resize, or animation frame). Mirrors {@link onZoomChange}
   * — together they cover every viewport change that moves a block on-screen.
   */
  onPanChange?: (pan: { x: number; y: number }) => void;
}
