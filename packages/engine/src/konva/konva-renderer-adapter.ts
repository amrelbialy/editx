import Konva from 'konva';
import type { RendererAdapter } from '../render-adapter';
import type { BlockData } from '../block/block.types';
import type { CropRect } from '../utils/crop-math';
import { PAGE_WIDTH, PAGE_HEIGHT } from '../block/property-keys';
import { clearImageCache } from '../utils/image-loader';
import { KonvaCamera } from './konva-camera';
import { KonvaNodeFactory } from './konva-node-factory';
import { KonvaCropOverlay } from './konva-crop-overlay';
import { setupInteraction } from './konva-interaction-handler';

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

    this.#transformer = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'middle-left',
        'middle-right',
        'top-center',
        'bottom-center',
      ],
    });
    this.#uiLayer.add(this.#transformer);

    this.#selectionRect = new Konva.Rect({
      fill: 'rgba(0,120,215,0.15)',
      stroke: 'rgba(0,120,215,0.6)',
      strokeWidth: 1,
      visible: false,
    });
    this.#uiLayer.add(this.#selectionRect);

    this.#camera = new KonvaCamera(this.#stage, this.#contentLayer, this.#uiLayer);
    this.#nodeFactory = new KonvaNodeFactory(this.#stage);
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
      },
    });

    this.#lastPageSize = { width: pageW, height: pageH };
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

    this.#nodeFactory.updateNode(node, block, this.resolveBlock);
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

  showTransformer(blockIds: number[]): void {
    const nodes = blockIds
      .map((id) => this.#nodeMap.get(id))
      .filter((n): n is Konva.Node => !!n);
    this.#transformer.nodes(nodes);
    this.#uiLayer.batchDraw();
  }

  hideTransformer(): void {
    this.#transformer.nodes([]);
    this.#uiLayer.batchDraw();
  }

  // --- Camera (delegated) ---

  setZoom(zoom: number): void {
    this.#camera.setZoom(zoom);
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
  fitToScreen(opts: { width: number; height: number; padding: number }): void {
    if (!this.#stage) return;
    this.#camera.fitToScreen(opts);
  }
  centerOnRect(rect: { x: number; y: number; width: number; height: number }): void {
    if (!this.#stage) return;
    this.#camera.centerOnRect(rect);
  }
  fitToRect(rect: { x: number; y: number; width: number; height: number }, padding = 24): void {
    if (!this.#stage) return;
    this.#camera.fitToRect(rect, padding);
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

    this.#cropOverlay.show(imageRect, initialCrop);
    // Redraw both content and UI layers
    this.#stage.batchDraw();
  }

  hideCropOverlay(): void {
    this.#cropOverlay.hide();
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
    this.#stage?.batchDraw();
  }

  // --- Cleanup ---

  dispose(): void {
    this.#resizeObserver?.disconnect();
    this.#cropOverlay?.destroy();
    this.#stage?.destroy();
    this.#nodeMap.clear();
    clearImageCache();
  }
}
