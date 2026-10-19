import type { BlockData } from "../block/block.types";
import type { BlockExportOptions, ExportOptions, ImageFillCrop } from "../editor-types";
import type { BlockClickEvent, BlockTransform, RendererAdapter } from "../render-adapter";
import type { CropRect } from "../utils/crop-math";
import { exportPage } from "./konva-export-page";
import { KonvaRendererBlocks } from "./konva-renderer-blocks";
import { KonvaRendererContext } from "./konva-renderer-context";
import { KonvaRendererControls } from "./konva-renderer-controls";
import { KonvaRendererScene } from "./konva-renderer-scene";

export class KonvaRendererAdapter implements RendererAdapter {
  #context = new KonvaRendererContext(this);
  #blocks = new KonvaRendererBlocks(this.#context);
  #controls = new KonvaRendererControls(this.#context, this.#blocks);
  #scene = new KonvaRendererScene(this.#context, this.#blocks);

  onBlockClick?: (blockId: number, event: BlockClickEvent) => void;
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  onEnterGroup?: (groupId: number, childId: number | null) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (blockId: number, transform: BlockTransform, anchorName?: string) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onCropChange?: (rect: CropRect) => void;
  onImageFillCropPreviewChange?: (crop: ImageFillCrop) => void;
  onImageFillCropDismiss?: () => void;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  onBlockTransform?: (blockId: number, phase: "drag" | "resize") => void;
  onAutoSize?: (blockId: number, computedHeight: number) => void;
  onAutoWidth?: (blockId: number, computedWidth: number) => void;
  resolveBlock?: (id: number) => BlockData | undefined;

  async init(root: HTMLElement): Promise<void> {
    return this.#scene.init(root);
  }

  async createScene(sceneBlock: BlockData, pageBlock: BlockData): Promise<void> {
    return this.#scene.createScene(sceneBlock, pageBlock);
  }

  syncBlock(id: number, block: BlockData): void {
    this.#blocks.syncBlock(id, block);
  }

  setGroupContext(stack: number[]): void {
    this.#blocks.setGroupContext(stack);
  }

  syncChildOrder(childIds: number[]): void {
    this.#blocks.syncChildOrder(childIds);
  }

  removeBlock(id: number): void {
    this.#blocks.removeBlock(id);
  }

  showTransformer(blockIds: number[], blockType?: string): void {
    this.#blocks.showTransformer(blockIds, blockType);
  }

  hideTransformer(): void {
    this.#blocks.hideTransformer();
  }

  getSelectedBlockScreenRect(): { x: number; y: number; width: number; height: number } | null {
    return this.#blocks.getSelectedBlockScreenRect();
  }

  getBlockScreenRect(
    blockId: number,
  ): { x: number; y: number; width: number; height: number } | null {
    return this.#blocks.getBlockScreenRect(blockId);
  }

  getBlockScreenTransform(
    blockId: number,
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
    return this.#blocks.getBlockScreenTransform(blockId);
  }

  setZoom(zoom: number, animate = false): void {
    this.#controls.setZoom(zoom, animate);
  }

  getZoom(): number {
    return this.#controls.getZoom();
  }

  panTo(x: number, y: number): void {
    this.#controls.panTo(x, y);
  }

  getPan(): { x: number; y: number } {
    return this.#controls.getPan();
  }

  fitToScreen(opts: { width: number; height: number; padding: number }, animate = false): void {
    this.#controls.fitToScreen(opts, animate);
  }

  centerOnRect(
    rect: { x: number; y: number; width: number; height: number },
    animate = false,
  ): void {
    this.#controls.centerOnRect(rect, animate);
  }

  fitToRect(
    rect: { x: number; y: number; width: number; height: number },
    padding = 24,
    animate = false,
  ): void {
    this.#controls.fitToRect(rect, padding, animate);
  }

  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#controls.screenToWorld(pt);
  }

  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#controls.worldToScreen(pt);
  }

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
  ): void {
    this.#controls.showCropOverlay(blockId, imageRect, initialCrop, transform);
  }

  hideCropOverlay(): void {
    this.#controls.hideCropOverlay();
  }

  offsetCropChildNodes(childIds: number[], dx: number, dy: number): void {
    this.#controls.offsetCropChildNodes(childIds, dx, dy);
  }

  setCropRect(rect: CropRect): void {
    this.#controls.setCropRect(rect);
  }

  setCropRatio(ratio: number | null): void {
    this.#controls.setCropRatio(ratio);
  }

  getCropRect(): CropRect | null {
    return this.#controls.getCropRect();
  }

  getCropImageRect(): CropRect | null {
    return this.#controls.getCropImageRect();
  }

  showImageFillCropPreview(blockId: number, crop: ImageFillCrop): ImageFillCrop | null {
    return this.#controls.showImageFillCropPreview(blockId, crop);
  }

  setImageFillCropPreview(crop: ImageFillCrop, ratio?: number | null): ImageFillCrop | null {
    return this.#controls.setImageFillCropPreview(crop, ratio);
  }

  hideImageFillCropPreview(): void {
    this.#controls.hideImageFillCropPreview();
  }

  renderFrame(): void {
    this.#scene.renderFrame();
  }

  setAccentColor(color: string): void {
    this.#scene.setAccentColor(color);
  }

  async exportScene(options: ExportOptions): Promise<Blob> {
    return this.#scene.exportScene(options);
  }

  async exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob> {
    return this.#scene.exportBlock(blockId, options);
  }

  async exportPage(pageId: number, options: Readonly<Required<ExportOptions>>): Promise<Blob> {
    if (!this.resolveBlock) throw new Error("Page export requires a block resolver");
    return exportPage(pageId, this.resolveBlock, options);
  }

  dispose(): void {
    this.#scene.dispose();
  }
}
