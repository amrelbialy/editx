import Konva from 'konva';
import type { RendererAdapter } from '../render-adapter';
import type { BlockData } from '../block/block.types';
import type { CropRect } from '../utils/crop-math';
import type { ExportOptions } from '../editor-types';
import { PAGE_WIDTH, PAGE_HEIGHT } from '../block/property-keys';
import { clearImageCache } from '../utils/image-loader';
import { KonvaCamera } from './konva-camera';
import { KonvaNodeFactory } from './konva-node-factory';
import { KonvaCropOverlay } from './konva-crop-overlay';
import { setupInteraction } from './konva-interaction-handler';
import { WebGLFilterRenderer } from './webgl-filter-renderer';
import { createStyledTransformer } from './konva-transformer-style';

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

  // Interaction callbacks (set by CreativeEngine after construction)
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
  /** Called when a text block auto-sizes its height. */
  onAutoSize?: (blockId: number, computedHeight: number) => void;

  /** Resolve a block by ID (set by CreativeEngine to read effect blocks). */
  resolveBlock?: (id: number) => BlockData | undefined;

  async init(root: HTMLElement): Promise<void> {
    this.#rootEl = root;
  }

  async createScene(sceneBlock: BlockData, pageBlock: BlockData): Promise<void> {
    const pageW = (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080;
    const pageH = (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080;

    this.#stage = new Konva.Stage({
      container: this.#rootEl as HTMLDivElement,
      width: this.#rootEl.clientWidth,
      height: this.#rootEl.clientHeight,
    });

    // Content layer: page background + design blocks
    this.#contentLayer = new Konva.Layer();
    this.#stage.add(this.#contentLayer);

    // UI layer: transformer + selection rect
    this.#uiLayer = new Konva.Layer();
    this.#stage.add(this.#uiLayer);

    this.#transformer = createStyledTransformer(this.#uiLayer);
    this.#uiLayer.add(this.#transformer);

    this.#selectionRect = new Konva.Rect({
      fill: 'rgba(0,120,215,0.15)',
      stroke: 'rgba(0,120,215,0.6)',
      strokeWidth: 1,
      visible: false,
    });
    this.#uiLayer.add(this.#selectionRect);

    this.#camera = new KonvaCamera(this.#stage, this.#contentLayer, this.#uiLayer);
    // Initialise WebGL filter renderer (falls back to CPU if not supported)
    try {
      if (WebGLFilterRenderer.isSupported()) {
        this.#webgl = new WebGLFilterRenderer();
      }
    } catch {
      this.#webgl = null;
    }
    this.#nodeFactory = new KonvaNodeFactory(this.#stage, this.#webgl);
    this.#cropOverlay = new KonvaCropOverlay(
      this.#uiLayer,
      (rect) => { this.onCropChange?.(rect); },
      (rect) => { this.#camera.fitToRect(rect, 24); },
    );

    setupInteraction({
      stage: this.#stage,
      selectionRect: this.#selectionRect,
      uiLayer: this.#uiLayer,
      nodeMap: this.#nodeMap,
      camera: this.#camera,
      callbacks: {
        onBlockClick: (blockId, event) => this.onBlockClick?.(blockId, event),
        onBlockDblClick: (blockId) => this.onBlockDblClick?.(blockId),
        onStageClick: (worldPos) => this.onStageClick?.(worldPos),
        onZoomChange: (zoom) => this.onZoomChange?.(zoom),
      },
    });

    this.#lastPageSize = { width: pageW, height: pageH };
    this.#camera.setPageSize(pageW, pageH);
    this.#camera.fitToScreen({ width: pageW, height: pageH, padding: 48 });

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

  // --- Block lifecycle ---

  syncBlock(id: number, block: BlockData): void {
    if (block.type === 'scene') return;
    // Effect blocks are not rendered directly; they are resolved by their owner.
    if (block.type === 'effect') return;
    // Shape and fill sub-blocks are resolved by their owner graphic block.
    if (block.type === 'shape' || block.type === 'fill') return;
    // Guard: renderer not yet initialised (createScene hasn't run)
    if (!this.#nodeFactory) return;

    let node = this.#nodeMap.get(id);

    if (!node) {
      const created = this.#nodeFactory.createNode(id, block, {
        onDragEnd: (blockId, x, y) => this.onBlockDragEnd?.(blockId, x, y),
        onTransformEnd: (blockId, transform) => this.onBlockTransformEnd?.(blockId, transform),
      }, this.resolveBlock);
      if (!created) return;
      node = created;
      this.#nodeMap.set(id, node);
      this.#contentLayer.add(node as Konva.Group | Konva.Shape);
    }

    const result = this.#nodeFactory.updateNode(node, block, this.resolveBlock);
    this.#transformer.moveToTop();

    // Auto-height: write computed text height back so the engine block store stays in sync
    if (result && result.autoHeight != null) {
      this.onAutoSize?.(id, result.autoHeight);
    }

    // Keep camera page size in sync for pan clamping
    if (block.type === 'page') {
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

  // --- Transformer ---

  showTransformer(blockIds: number[], blockType?: string): void {
    const nodes = blockIds
      .map((id) => this.#nodeMap.get(id))
      .filter((n): n is Konva.Node => !!n);
    this.#transformer.nodes(nodes);

    // Text blocks: corners only (no center pill handles)
    if (blockType === 'text') {
      this.#transformer.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
    } else {
      this.#transformer.enabledAnchors([
        'top-left', 'top-right', 'bottom-left', 'bottom-right',
        'middle-left', 'middle-right', 'top-center', 'bottom-center',
      ]);
    }

    // Bind hover events on anchors (deferred until Konva creates them)
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

  /** Get the screen rect of a specific block node (independent of transformer). */
  getBlockScreenRect(blockId: number): { x: number; y: number; width: number; height: number } | null {
    const node = this.#nodeMap.get(blockId);
    if (!node) return null;
    const rect = node.getClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  // --- Camera (delegated) ---

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
  centerOnRect(rect: { x: number; y: number; width: number; height: number }, animate = false): void {
    if (!this.#stage) return;
    this.#camera.centerOnRect(rect, animate);
  }
  fitToRect(rect: { x: number; y: number; width: number; height: number }, padding = 24, animate = false): void {
    if (!this.#stage) return;
    this.#camera.fitToRect(rect, padding, animate);
  }
  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.screenToWorld(pt);
  }
  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.worldToScreen(pt);
  }

  // --- Crop overlay ---

  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: { rotation: number; flipH: boolean; flipV: boolean; sourceWidth: number; sourceHeight: number },
  ): void {
    // Hide the normal transformer while crop mode is active
    this.hideTransformer();

    // Expand the page node to show the full original image while keeping
    // rotation/flip intact — the crop overlay works in visual (rotated) space.
    const pageNode = this.#nodeMap.get(blockId);
    if (pageNode && pageNode.getAttr('isPage')) {
      const group = pageNode as Konva.Group;
      const bgRect = group.children[0] as Konva.Rect;
      const imgNode = group.children[1] as Konva.Image;

      if (imgNode.visible()) {
        // Use explicit rotation from block store (always up-to-date)
        const rotation = transform?.rotation ?? 0;
        const flipH = transform?.flipH ?? false;
        const flipV = transform?.flipV ?? false;

        // Source (pre-rotation) image dimensions — passed explicitly from the editor
        const sourceW = transform?.sourceWidth ?? imageRect.width;
        const sourceH = transform?.sourceHeight ?? imageRect.height;

        // Apply rotation and flip from block state
        imgNode.rotation(rotation);
        imgNode.scaleX(flipH ? -1 : 1);
        imgNode.scaleY(flipV ? -1 : 1);

        // Render full source image (clear any previous Konva crop)
        imgNode.width(sourceW);
        imgNode.height(sourceH);
        imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });

        // Re-center rotation/flip within the visual bounds
        imgNode.offsetX(sourceW / 2);
        imgNode.offsetY(sourceH / 2);
        imgNode.x(imageRect.width / 2);
        imgNode.y(imageRect.height / 2);
      }
      bgRect.width(imageRect.width);
      bgRect.height(imageRect.height);
    }

    // Mark the page node as being in crop-overlay mode so that any re-sync
    // (e.g. triggered by a flip during crop mode) doesn't shrink the image
    // back to crop dimensions.
    if (pageNode) pageNode.setAttr('_cropOverlayActive', true);

    this.#cropOverlay.show(imageRect, initialCrop);
    // Redraw both content and UI layers
    this.#stage.batchDraw();
  }

  hideCropOverlay(): void {
    this.#cropOverlay.hide();
    // Clear the crop-overlay flag on all page nodes
    this.#nodeMap.forEach((node) => {
      if (node.getAttr('_cropOverlayActive')) {
        node.setAttr('_cropOverlayActive', false);
      }
    });
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

  // --- Render ---

  renderFrame(): void {
    // Synchronous draw — avoids the extra rAF delay from batchDraw(),
    // which matters during slider drag where we're already in a rAF callback.
    this.#contentLayer?.draw();
    this.#uiLayer?.draw();
  }

  // --- Export ---

  async exportScene(options: ExportOptions): Promise<Blob> {
    if (!this.#stage || !this.#lastPageSize) {
      throw new Error('Cannot export: scene not initialised');
    }

    const format = options.format ?? 'png';
    const quality = options.quality ?? 0.92;
    const pixelRatio = options.pixelRatio ?? 1;
    const { width: pageW, height: pageH } = this.#lastPageSize;
    const mimeType = `image/${format}`;

    // Save current content layer transform (camera pan/zoom)
    const savedScaleX = this.#contentLayer.scaleX();
    const savedScaleY = this.#contentLayer.scaleY();
    const savedX = this.#contentLayer.x();
    const savedY = this.#contentLayer.y();

    // Reset to identity so the page fills the export canvas exactly
    this.#contentLayer.scaleX(1);
    this.#contentLayer.scaleY(1);
    this.#contentLayer.x(0);
    this.#contentLayer.y(0);

    // Hide UI layer (transformer, crop overlay, selection rect)
    const uiWasVisible = this.#uiLayer.visible();
    this.#uiLayer.visible(false);

    try {
      const dataUrl = this.#stage.toDataURL({
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
        pixelRatio,
        mimeType,
        quality: format === 'png' ? undefined : quality,
      });

      return await dataUrlToBlob(dataUrl, mimeType);
    } finally {
      // Restore content layer transform
      this.#contentLayer.scaleX(savedScaleX);
      this.#contentLayer.scaleY(savedScaleY);
      this.#contentLayer.x(savedX);
      this.#contentLayer.y(savedY);

      // Restore UI layer
      this.#uiLayer.visible(uiWasVisible);
    }
  }

  // --- Cleanup ---

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

/** Convert a data URL string to a Blob without using fetch(). */
function dataUrlToBlob(dataUrl: string, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const base64 = dataUrl.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: mimeType }));
    } catch (err) {
      reject(err);
    }
  });
}
