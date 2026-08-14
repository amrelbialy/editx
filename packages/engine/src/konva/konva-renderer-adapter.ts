import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import type { ExportOptions } from "../editor-types";
import type { BlockClickEvent, RendererAdapter } from "../render-adapter";
import type { CropRect } from "../utils/crop-math";
import { clearImageCache } from "../utils/image-loader";
import { getNodeScreenTransform } from "./konva-block-screen-transform";
import type { KonvaCamera } from "./konva-camera";
import { clearCropOverlayFlags, expandPageNodeForCrop } from "./konva-crop-helpers";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import { exportScene } from "./konva-export";
import { applyGroupContext, createGroupOutline } from "./konva-group-affordance";
import { containerForBlock, nestGroupChildren } from "./konva-group-node";
import { KonvaHoverOutline } from "./konva-hover-outline";
import type { KonvaNodeFactory } from "./konva-node-factory";
import { createKonvaScene } from "./konva-scene-setup";
import { observeViewportResize } from "./konva-viewport-resize";
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
  #updateAccentColor?: (color: string) => void;
  #hoverOutline!: KonvaHoverOutline;
  #groupContext: number[] = [];
  #groupOutline!: Konva.Rect;

  onBlockClick?: (blockId: number, event: BlockClickEvent) => void;
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  onEnterGroup?: (groupId: number, childId: number | null) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
    anchorName?: string,
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onCropChange?: (rect: CropRect) => void;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  onBlockTransform?: (blockId: number, phase: "drag" | "resize") => void;
  onAutoSize?: (blockId: number, computedHeight: number) => void;
  onAutoWidth?: (blockId: number, computedWidth: number) => void;
  resolveBlock?: (id: number) => BlockData | undefined;

  async init(root: HTMLElement): Promise<void> {
    this.#rootEl = root;
  }

  async createScene(_sceneBlock: BlockData, pageBlock: BlockData): Promise<void> {
    // Tear down any previous scene before building a new one. On reload
    // (loadScene), blocks are restored with their original IDs, so stale
    // entries left in #nodeMap would be reused by syncBlock and never attached
    // to the new content layer — leaving the canvas blank.
    if (this.#stage) {
      this.#resizeObserver?.disconnect();
      this.#cropOverlay?.destroy();
      this.#webgl?.dispose();
      this.#webgl = null;
      this.#stage.destroy();
      this.#nodeMap.clear();
    }

    const pageW = (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080;
    const pageH = (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080;

    const scene = createKonvaScene(this.#rootEl, pageW, pageH, this.#nodeMap, {
      onBlockClick: (blockId, event) => this.onBlockClick?.(blockId, event),
      onBlockDblClick: (blockId, screenPos) => this.onBlockDblClick?.(blockId, screenPos),
      onEnterGroup: (groupId, childId) => this.onEnterGroup?.(groupId, childId),
      onStageClick: (worldPos) => this.onStageClick?.(worldPos),
      onZoomChange: (zoom) => this.onZoomChange?.(zoom),
      onBlockTransform: (blockId, phase) => this.onBlockTransform?.(blockId, phase),
      onCropChange: (rect) => this.onCropChange?.(rect),
      getGroupContext: () => this.#groupContext,
    });

    this.#stage = scene.stage;
    this.#contentLayer = scene.contentLayer;
    this.#uiLayer = scene.uiLayer;
    this.#transformer = scene.transformer;
    this.#selectionRect = scene.selectionRect;
    this.#camera = scene.camera;
    this.#camera.setPanChangeListener((pan) => this.onPanChange?.(pan));
    this.#nodeFactory = scene.nodeFactory;
    this.#cropOverlay = scene.cropOverlay;
    this.#webgl = scene.webgl;
    this.#updateAccentColor = scene.updateAccentColor;
    this.#lastPageSize = { width: pageW, height: pageH };

    this.#hoverOutline = new KonvaHoverOutline(
      this.#uiLayer,
      this.#contentLayer,
      this.#transformer,
      this.#camera,
      () => this.#groupContext,
      "#4971FF",
    );

    this.#groupContext = [];
    this.#groupOutline = createGroupOutline();
    this.#uiLayer.add(this.#groupOutline);

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = observeViewportResize({
      rootEl: this.#rootEl,
      stage: this.#stage,
      camera: this.#camera,
      getPageSize: () => this.#lastPageSize,
      getCropFitRect: () => this.#getCropFitRect(),
    });
  }

  /**
   * The rect the camera should stay fitted to while crop mode is active, or
   * `null` when not cropping. Mirrors the fit target chosen in
   * {@link EditorCrop.setupCropOverlay} (`crop ?? image`) so a resize keeps the
   * same framing the crop entry established.
   */
  #getCropFitRect(): CropRect | null {
    if (!this.#cropOverlay?.isVisible()) return null;
    return this.#cropOverlay.getCropRect() ?? this.#cropOverlay.getImageRect();
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
          onTransformEnd: (blockId, transform) => {
            const anchor = this.#transformer?.getActiveAnchor?.() ?? "";
            this.onBlockTransformEnd?.(blockId, transform, anchor);
          },
          getActiveAnchor: () => this.#transformer?.getActiveAnchor?.() ?? "",
        },
        this.resolveBlock,
      );
      if (!created) return;
      node = created;
      this.#nodeMap.set(id, node);
      this.#contentLayer.add(node as Konva.Group | Konva.Shape);
      this.#hoverOutline.bind(node);
    }

    const result = this.#nodeFactory.updateNode(node, block, this.resolveBlock);

    // Keep the Konva tree mirroring the block tree: nest grouped children inside
    // their group node so their stored coords stay parent-relative (no abs↔local
    // math), and re-home a block whenever its group membership changes.
    if (block.type === "group") {
      nestGroupChildren(node as Konva.Group, block.children, this.#nodeMap);
    } else if (block.type !== "page") {
      const container = containerForBlock(block, this.#nodeMap, this.#contentLayer);
      if (node.getParent() !== container) node.moveTo(container);
    }

    this.#transformer.moveToTop();
    if (result && result.autoHeight != null) {
      this.onAutoSize?.(id, result.autoHeight);
    }
    if (result && result.autoWidth != null) {
      this.onAutoWidth?.(id, result.autoWidth);
    }
    if (block.type === "page") {
      const pw = (block.properties[PAGE_WIDTH] as number) ?? 1080;
      const ph = (block.properties[PAGE_HEIGHT] as number) ?? 1080;
      this.#camera.setPageSize(pw, ph);
      this.#lastPageSize = { width: pw, height: ph };
    }
  }

  setGroupContext(stack: number[]): void {
    this.#groupContext = [...stack];
    this.#applyGroupContext();
    this.#uiLayer.batchDraw();
    this.#contentLayer.batchDraw();
  }

  /** Apply draggable scoping and the dashed active-group outline. */
  #applyGroupContext(): void {
    if (!this.#groupOutline) return;
    applyGroupContext({
      stack: this.#groupContext,
      nodeMap: this.#nodeMap,
      contentLayer: this.#contentLayer,
      outline: this.#groupOutline,
    });
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

  showTransformer(blockIds: number[], _blockType?: string): void {
    const nodes = blockIds.map((id) => this.#nodeMap.get(id)).filter((n): n is Konva.Node => !!n);
    this.#hoverOutline.hide();
    this.#transformer.nodes(nodes);
    this.#transformer.enabledAnchors([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "middle-left",
      "middle-right",
      "top-center",
      "bottom-center",
    ]);
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

  getBlockScreenTransform(
    blockId: number,
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
    const node = this.#nodeMap.get(blockId);
    return node ? getNodeScreenTransform(node) : null;
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
    // expandPageNodeForCrop mutates page nodes on the content layer; the crop
    // overlay itself lives on (and redraws) the UI layer via #cropOverlay.show.
    expandPageNodeForCrop(this.#nodeMap, blockId, imageRect, transform);
    // Crop mode renders the full original image (imageRect), not the committed
    // crop. Point the camera's pan-clamp bounds at that expanded canvas so the
    // fitToRect(crop) that follows can center the crop instead of being clamped
    // back to the (smaller) committed page size.
    this.#camera.setPageSize(imageRect.width, imageRect.height);
    this.#cropOverlay.applyViewportScale(this.#camera.getZoom());
    this.#cropOverlay.show(imageRect, initialCrop);
    this.#contentLayer.batchDraw();
  }

  hideCropOverlay(): void {
    this.#cropOverlay.hide();
    clearCropOverlayFlags(this.#nodeMap);
    // Restore pan-clamp bounds to the committed page size now that the full
    // image is no longer shown.
    if (this.#lastPageSize) {
      this.#camera.setPageSize(this.#lastPageSize.width, this.#lastPageSize.height);
    }
  }

  offsetCropChildNodes(childIds: number[], dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    for (const childId of childIds) {
      const node = this.#nodeMap.get(childId);
      if (node) {
        node.x(node.x() + dx);
        node.y(node.y() + dy);
      }
    }
    this.#contentLayer.batchDraw();
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
    // Scoped, batched redraws — avoid synchronous full-stage draws.
    this.#applyGroupContext();
    this.#contentLayer?.batchDraw();
    this.#uiLayer?.batchDraw();
  }

  setAccentColor(color: string): void {
    this.#updateAccentColor?.(color);
    this.#cropOverlay?.setAccentColor(color);
    this.#hoverOutline?.setAccentColor(color);
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
