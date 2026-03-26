import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import type { ExportOptions } from "../editor-types";
import type { RendererAdapter } from "../render-adapter";
import type { CropRect } from "../utils/crop-math";
import { clearImageCache } from "../utils/image-loader";
import type { KonvaCamera } from "./konva-camera";
import { clearCropOverlayFlags, expandPageNodeForCrop } from "./konva-crop-helpers";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import { exportScene } from "./konva-export";
import type { KonvaNodeFactory } from "./konva-node-factory";
import { createKonvaScene } from "./konva-scene-setup";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export class KonvaRendererAdapter implements RendererAdapter {
  #stage!: Konva.Stage;
  #rootEl!: HTMLElement;
  #contentLayer!: Konva.Layer;
  #uiLayer!: Konva.Layer;
  #transformer!: Konva.Transformer;
  #selectionRect!: Konva.Rect;

  #nodeMap = new Map<number, Konva.Node>();
  #camera!: KonvaCamera;
  #nodeFactory!: KonvaNodeFactory;
  #cropOverlay!: KonvaCropOverlay;
  #resizeObserver?: ResizeObserver;
  #lastPageSize?: { width: number; height: number };
  #webgl: WebGLFilterRenderer | null = null;

  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDblClick?: (blockId: number) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onCropChange?: (rect: CropRect) => void;
  onZoomChange?: (zoom: number) => void;
  onAutoSize?: (blockId: number, computedHeight: number) => void;
  resolveBlock?: (id: number) => BlockData | undefined;

  async init(root: HTMLElement): Promise<void> {
    this.#rootEl = root;
  }

  async createScene(_sceneBlock: BlockData, pageBlock: BlockData): Promise<void> {
    const pageW = (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080;
    const pageH = (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080;

    const scene = createKonvaScene(this.#rootEl, pageW, pageH, this.#nodeMap, {
      onBlockClick: (blockId, event) => this.onBlockClick?.(blockId, event),
      onBlockDblClick: (blockId) => this.onBlockDblClick?.(blockId),
      onStageClick: (worldPos) => this.onStageClick?.(worldPos),
      onZoomChange: (zoom) => this.onZoomChange?.(zoom),
      onCropChange: (rect) => this.onCropChange?.(rect),
    });

    this.#stage = scene.stage;
    this.#contentLayer = scene.contentLayer;
    this.#uiLayer = scene.uiLayer;
    this.#transformer = scene.transformer;
    this.#selectionRect = scene.selectionRect;
    this.#camera = scene.camera;
    this.#nodeFactory = scene.nodeFactory;
    this.#cropOverlay = scene.cropOverlay;
    this.#webgl = scene.webgl;
    this.#lastPageSize = { width: pageW, height: pageH };

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      const w = this.#rootEl.clientWidth;
      const h = this.#rootEl.clientHeight;
      if (w === 0 || h === 0) return;
      this.#stage.width(w);
      this.#stage.height(h);
      if (this.#lastPageSize) {
        this.#camera.fitToScreen({ ...this.#lastPageSize, padding: 48 });
      }
    });
    this.#resizeObserver.observe(this.#rootEl);
  }

  syncBlock(id: number, block: BlockData): void {
    if (
      block.type === "scene" ||
      block.type === "effect" ||
      block.type === "shape" ||
      block.type === "fill"
    )
      return;
    if (!this.#nodeFactory) return;

    let node = this.#nodeMap.get(id);

    if (!node) {
      const created = this.#nodeFactory.createNode(
        id,
        block,
        {
          onDragEnd: (blockId, x, y) => this.onBlockDragEnd?.(blockId, x, y),
          onTransformEnd: (blockId, transform) => this.onBlockTransformEnd?.(blockId, transform),
        },
        this.resolveBlock,
      );
      if (!created) return;
      node = created;
      this.#nodeMap.set(id, node);
      this.#contentLayer.add(node as Konva.Group | Konva.Shape);
    }

    const result = this.#nodeFactory.updateNode(node, block, this.resolveBlock);
    this.#transformer.moveToTop();
    if (result && result.autoHeight != null) {
      this.onAutoSize?.(id, result.autoHeight);
    }
    if (block.type === "page") {
      const pw = (block.properties[PAGE_WIDTH] as number) ?? 1080;
      const ph = (block.properties[PAGE_HEIGHT] as number) ?? 1080;
      this.#camera.setPageSize(pw, ph);
      this.#lastPageSize = { width: pw, height: ph };
    }
  }

  syncChildOrder(childIds: number[]): void {
    for (const childId of childIds) {
      const childNode = this.#nodeMap.get(childId);
      if (childNode) {
        childNode.moveToTop();
      }
    }
    this.#transformer.moveToTop();
  }

  removeBlock(id: number): void {
    const node = this.#nodeMap.get(id);
    if (node) {
      const trNodes = this.#transformer.nodes();
      if (trNodes.includes(node)) {
        this.#transformer.nodes(trNodes.filter((n) => n !== node));
      }
      node.destroy();
      this.#nodeMap.delete(id);
    }
  }

  showTransformer(blockIds: number[], blockType?: string): void {
    const nodes = blockIds.map((id) => this.#nodeMap.get(id)).filter((n): n is Konva.Node => !!n);
    this.#transformer.nodes(nodes);
    this.#transformer.enabledAnchors(
      blockType === "text"
        ? ["top-left", "top-right", "bottom-left", "bottom-right"]
        : [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ],
    );
    (this.#transformer as any)._bindHoverEvents?.();
    this.#uiLayer.batchDraw();
  }

  hideTransformer(): void {
    this.#transformer.nodes([]);
    this.#uiLayer.batchDraw();
  }

  getSelectedBlockScreenRect(): { x: number; y: number; width: number; height: number } | null {
    if (!this.#transformer || this.#transformer.nodes().length === 0) return null;
    const rect = this.#transformer.getClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  getBlockScreenRect(
    blockId: number,
  ): { x: number; y: number; width: number; height: number } | null {
    const node = this.#nodeMap.get(blockId);
    if (!node) return null;
    const rect = node.getClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  setZoom(zoom: number, animate = false): void {
    this.#camera.setZoom(zoom, animate);
  }
  getZoom(): number {
    return this.#camera.getZoom();
  }
  panTo(x: number, y: number): void {
    this.#camera.panTo(x, y);
  }
  getPan(): { x: number; y: number } {
    return this.#camera.getPan();
  }
  fitToScreen(opts: { width: number; height: number; padding: number }, animate = false): void {
    if (!this.#stage) return;
    this.#camera.fitToScreen(opts, animate);
  }
  centerOnRect(
    rect: { x: number; y: number; width: number; height: number },
    animate = false,
  ): void {
    if (!this.#stage) return;
    this.#camera.centerOnRect(rect, animate);
  }
  fitToRect(
    rect: { x: number; y: number; width: number; height: number },
    padding = 24,
    animate = false,
  ): void {
    if (!this.#stage) return;
    this.#camera.fitToRect(rect, padding, animate);
  }
  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.screenToWorld(pt);
  }
  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.worldToScreen(pt);
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
    this.hideTransformer();
    expandPageNodeForCrop(this.#nodeMap, blockId, imageRect, transform);
    this.#cropOverlay.show(imageRect, initialCrop);
    this.#stage.batchDraw();
  }

  hideCropOverlay(): void {
    this.#cropOverlay.hide();
    clearCropOverlayFlags(this.#nodeMap);
  }

  setCropRect(rect: CropRect): void {
    this.#cropOverlay.setCropRect(rect);
  }
  setCropRatio(ratio: number | null): void {
    this.#cropOverlay.setRatio(ratio);
  }
  getCropRect(): CropRect | null {
    return this.#cropOverlay.isVisible() ? this.#cropOverlay.getCropRect() : null;
  }
  getCropImageRect(): CropRect | null {
    return this.#cropOverlay.isVisible() ? this.#cropOverlay.getImageRect() : null;
  }

  renderFrame(): void {
    this.#contentLayer?.draw();
    this.#uiLayer?.draw();
  }

  async exportScene(options: ExportOptions): Promise<Blob> {
    if (!this.#stage || !this.#lastPageSize) {
      throw new Error("Cannot export: scene not initialised");
    }
    return exportScene(this.#stage, this.#contentLayer, this.#uiLayer, this.#lastPageSize, options);
  }

  dispose(): void {
    this.#resizeObserver?.disconnect();
    this.#cropOverlay?.destroy();
    this.#webgl?.dispose();
    this.#webgl = null;
    this.#stage?.destroy();
    this.#nodeMap.clear();
    clearImageCache();
  }
}
