import Konva from 'konva';
import type { RendererAdapter } from '../render-adapter';
import type { BlockData, Color } from '../block/block.types';
import { PAGE_WIDTH, PAGE_HEIGHT, FILL_COLOR } from '../block/property-keys';
import { colorToHex } from '../utils/color';
import { clearImageCache } from '../utils/image-loader';
import { KonvaCamera } from './konva-camera';
import { KonvaNodeFactory } from './konva-node-factory';
import { setupInteraction } from './konva-interaction-handler';

export class KonvaRendererAdapter implements RendererAdapter {
  #stage!: Konva.Stage;
  #rootEl!: HTMLElement;
  #contentLayer!: Konva.Layer;
  #uiLayer!: Konva.Layer;
  #transformer!: Konva.Transformer;
  #selectionRect!: Konva.Rect;
  #pageRect!: Konva.Rect;

  #nodeMap = new Map<number, Konva.Node>();
  #camera!: KonvaCamera;
  #nodeFactory!: KonvaNodeFactory;

  // Interaction callbacks (set by CreativeEngine after construction)
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;

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

    const fillColor = pageBlock.properties[FILL_COLOR];
    this.#pageRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      fill:
        fillColor && typeof fillColor === 'object'
          ? colorToHex(fillColor as Color)
          : '#ffffff',
      listening: false,
    });
    this.#contentLayer.add(this.#pageRect);

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

    // Wire up sub-modules
    this.#camera = new KonvaCamera(this.#stage, this.#contentLayer, this.#uiLayer);
    this.#nodeFactory = new KonvaNodeFactory(this.#stage);

    setupInteraction({
      stage: this.#stage,
      pageRect: this.#pageRect,
      selectionRect: this.#selectionRect,
      uiLayer: this.#uiLayer,
      nodeMap: this.#nodeMap,
      camera: this.#camera,
      callbacks: {
        onBlockClick: (blockId, event) => this.onBlockClick?.(blockId, event),
        onStageClick: (worldPos) => this.onStageClick?.(worldPos),
      },
    });

    this.#camera.fitToScreen({ width: pageW, height: pageH, padding: 48 });
  }

  // --- Block lifecycle ---

  syncBlock(id: number, block: BlockData): void {
    if (block.type === 'scene' || block.type === 'page') return;

    let node = this.#nodeMap.get(id);

    if (!node) {
      const created = this.#nodeFactory.createNode(id, block, {
        onDragEnd: (blockId, x, y) => this.onBlockDragEnd?.(blockId, x, y),
        onTransformEnd: (blockId, transform) => this.onBlockTransformEnd?.(blockId, transform),
      });
      if (!created) return;
      node = created;
      this.#nodeMap.set(id, node);
      this.#contentLayer.add(node as Konva.Group | Konva.Shape);
    }

    this.#nodeFactory.updateNode(node, block);
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
  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.screenToWorld(pt);
  }
  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return this.#camera.worldToScreen(pt);
  }

  // --- Render ---

  renderFrame(): void {
    this.#stage?.batchDraw();
  }

  // --- Cleanup ---

  dispose(): void {
    this.#stage?.destroy();
    this.#nodeMap.clear();
    clearImageCache();
  }
}
