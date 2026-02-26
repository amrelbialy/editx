import Konva from "konva";
import type { RendererAdapter } from "./render-adapter";
import type { BlockData, Color } from "./block/block.types";
import { colorToHex } from "./utils/color";
import { loadImage, clearImageCache } from "./utils/image-loader";

export class KonvaRendererAdapter implements RendererAdapter {
  #stage!: Konva.Stage;
  #rootEl!: HTMLElement;
  #contentLayer!: Konva.Layer;
  #uiLayer!: Konva.Layer;
  #transformer!: Konva.Transformer;
  #selectionRect!: Konva.Rect;
  #pageRect!: Konva.Rect;

  #nodeMap = new Map<number, Konva.Node>();
  #zoom = 1;
  #pan = { x: 0, y: 0 };

  // Interaction callbacks
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (
    blockId: number,
    transform: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }
  ) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;

  async init(root: HTMLElement): Promise<void> {
    this.#rootEl = root;
  }

  async createScene(
    sceneBlock: BlockData,
    pageBlock: BlockData
  ): Promise<void> {
    const pageW = (pageBlock.properties["page/width"] as number) ?? 1080;
    const pageH = (pageBlock.properties["page/height"] as number) ?? 1080;

    this.#stage = new Konva.Stage({
      container: this.#rootEl as HTMLDivElement,
      width: this.#rootEl.clientWidth,
      height: this.#rootEl.clientHeight,
    });

    // Content layer: page background + design blocks
    this.#contentLayer = new Konva.Layer();
    this.#stage.add(this.#contentLayer);

    // Page background rect
    const fillColor = pageBlock.properties["fill/color"];
    this.#pageRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      fill:
        fillColor && typeof fillColor === "object"
          ? colorToHex(fillColor as Color)
          : "#ffffff",
      listening: false,
    });
    this.#contentLayer.add(this.#pageRect);

    // UI layer: transformer + selection rect
    this.#uiLayer = new Konva.Layer();
    this.#stage.add(this.#uiLayer);

    this.#transformer = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "top-center",
        "bottom-center",
      ],
    });
    this.#uiLayer.add(this.#transformer);

    this.#selectionRect = new Konva.Rect({
      fill: "rgba(0,120,215,0.15)",
      stroke: "rgba(0,120,215,0.6)",
      strokeWidth: 1,
      visible: false,
    });
    this.#uiLayer.add(this.#selectionRect);

    this.#setupInteraction();

    // Center page on screen
    this.fitToScreen({ width: pageW, height: pageH, padding: 48 });
  }

  // --- Block lifecycle ---

  syncBlock(id: number, block: BlockData): void {
    // Skip scene/page blocks — they're handled by createScene
    if (block.type === "scene" || block.type === "page") return;

    let node: Konva.Node | undefined = this.#nodeMap.get(id);

    if (!node) {
      const created = this.#createNode(id, block);
      if (!created) return;
      node = created;
      this.#nodeMap.set(id, node);
      this.#contentLayer.add(node as Konva.Group | Konva.Shape);
    }

    this.#updateNode(node, block);
    // Move transformer to top of UI layer
    this.#transformer.moveToTop();
  }

  removeBlock(id: number): void {
    const node = this.#nodeMap.get(id);
    if (node) {
      // Remove from transformer if selected
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

  // --- Camera ---

  setZoom(zoom: number): void {
    this.#zoom = zoom;
    this.#applyCamera();
  }

  getZoom(): number {
    return this.#zoom;
  }

  panTo(x: number, y: number): void {
    this.#pan = { x, y };
    this.#applyCamera();
  }

  getPan(): { x: number; y: number } {
    return { ...this.#pan };
  }

  fitToScreen(opts: { width: number; height: number; padding: number }): void {
    if (!this.#stage) return;
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    const scaleX = (stageW - opts.padding * 2) / opts.width;
    const scaleY = (stageH - opts.padding * 2) / opts.height;
    const scale = Math.min(scaleX, scaleY);

    this.#zoom = scale;
    this.#pan = {
      x: (stageW - opts.width * scale) / 2,
      y: (stageH - opts.height * scale) / 2,
    };
    this.#applyCamera();
  }

  centerOnRect(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    if (!this.#stage) return;
    const stageW = this.#stage.width();
    const stageH = this.#stage.height();
    this.#pan = {
      x: stageW / 2 - (rect.x + rect.width / 2) * this.#zoom,
      y: stageH / 2 - (rect.y + rect.height / 2) * this.#zoom,
    };
    this.#applyCamera();
  }

  // --- Coordinate transforms ---

  screenToWorld(pt: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (pt.x - this.#pan.x) / this.#zoom,
      y: (pt.y - this.#pan.y) / this.#zoom,
    };
  }

  worldToScreen(pt: { x: number; y: number }): { x: number; y: number } {
    return {
      x: pt.x * this.#zoom + this.#pan.x,
      y: pt.y * this.#zoom + this.#pan.y,
    };
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

  // --- Private helpers ---

  #applyCamera(): void {
    if (!this.#contentLayer) return;
    this.#contentLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#contentLayer.position(this.#pan);
    this.#uiLayer.scale({ x: this.#zoom, y: this.#zoom });
    this.#uiLayer.position(this.#pan);
    this.#stage.batchDraw();
  }

  #createNode(id: number, block: BlockData): Konva.Node | null {
    const kind = block.kind || "rect";

    let node: Konva.Shape;

    if (block.type === "image") {
      node = new Konva.Image({
        name: `block-${id}`,
        draggable: false,
        image: undefined as unknown as CanvasImageSource,
      });
    } else if (block.type === "text") {
      node = new Konva.Text({
        name: `block-${id}`,
        draggable: true,
      });
    } else if (kind === "ellipse") {
      node = new Konva.Ellipse({
        name: `block-${id}`,
        draggable: true,
        radiusX: 50,
        radiusY: 50,
      });
    } else {
      node = new Konva.Rect({
        name: `block-${id}`,
        draggable: true,
      });
    }

    (node as any).__blockId = id;

    node.on("dragend", () => {
      const pos = node.position();
      this.onBlockDragEnd?.(id, pos.x, pos.y);
    });

    node.on("transformend", () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      this.onBlockTransformEnd?.(id, {
        x: node.x(),
        y: node.y(),
        width: node.width() * scaleX,
        height: node.height() * scaleY,
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    });

    return node;
  }

  #updateNode(node: Konva.Node, block: BlockData): void {
    const props = block.properties;

    const x = (props["transform/position/x"] as number) ?? 0;
    const y = (props["transform/position/y"] as number) ?? 0;
    const width = (props["transform/size/width"] as number) ?? 100;
    const height = (props["transform/size/height"] as number) ?? 100;
    const rotation = (props["transform/rotation"] as number) ?? 0;
    const opacity = (props["appearance/opacity"] as number) ?? 1;
    const visible = (props["appearance/visible"] as boolean) ?? true;

    node.setAttrs({ x, y, rotation, opacity, visible });

    if (block.type === "image") {
      const imgNode = node as Konva.Image;
      imgNode.width(width);
      imgNode.height(height);
      const src = (props["image/src"] as string) ?? "";
      if (src && (imgNode as any).__loadedSrc !== src) {
        (imgNode as any).__loadedSrc = src;
        loadImage(src).then((htmlImg) => {
          imgNode.image(htmlImg);
          this.#stage?.batchDraw();
        });
      }
      return;
    }

    if (block.type === "text") {
      const textNode = node as Konva.Text;
      textNode.text((props["text/content"] as string) ?? "Text");
      textNode.fontSize((props["text/fontSize"] as number) ?? 24);
      textNode.fontFamily((props["text/fontFamily"] as string) ?? "Arial");
      textNode.width(width);
      const fillColor = props["fill/color"];
      if (fillColor && typeof fillColor === "object") {
        textNode.fill(colorToHex(fillColor as Color));
      }
    } else if (node instanceof Konva.Ellipse) {
      (node as Konva.Ellipse).radiusX(width / 2);
      (node as Konva.Ellipse).radiusY(height / 2);
      const fillColor = props["fill/color"];
      if (fillColor && typeof fillColor === "object") {
        (node as Konva.Ellipse).fill(colorToHex(fillColor as Color));
      }
      const strokeColor = props["stroke/color"];
      if (strokeColor && typeof strokeColor === "object") {
        (node as Konva.Ellipse).stroke(colorToHex(strokeColor as Color));
        (node as Konva.Ellipse).strokeWidth(
          (props["stroke/width"] as number) ?? 0
        );
      }
    } else if (node instanceof Konva.Rect) {
      node.width(width);
      node.height(height);
      const fillColor = props["fill/color"];
      if (fillColor && typeof fillColor === "object") {
        (node as Konva.Rect).fill(colorToHex(fillColor as Color));
      }
      const strokeColor = props["stroke/color"];
      if (strokeColor && typeof strokeColor === "object") {
        (node as Konva.Rect).stroke(colorToHex(strokeColor as Color));
        (node as Konva.Rect).strokeWidth(
          (props["stroke/width"] as number) ?? 0
        );
      }
    }
  }

  #setupInteraction(): void {
    let x1 = 0,
      y1 = 0,
      x2 = 0,
      y2 = 0;
    let selecting = false;

    // Click on stage background → deselect
    this.#stage.on("click tap", (e) => {
      if (this.#selectionRect.visible() && this.#selectionRect.width() > 0) {
        return;
      }

      if (e.target === this.#stage || e.target === this.#pageRect) {
        const pos = this.#stage.getPointerPosition();
        const worldPos = pos ? this.screenToWorld(pos) : { x: 0, y: 0 };
        this.onStageClick?.(worldPos);
        return;
      }

      // Check if click was on a block node
      const blockId = (e.target as any).__blockId as number | undefined;
      if (blockId !== undefined) {
        const shiftKey =
          (e.evt as MouseEvent).shiftKey ||
          (e.evt as MouseEvent).ctrlKey ||
          (e.evt as MouseEvent).metaKey;
        this.onBlockClick?.(blockId, { shiftKey });
      }
    });

    // Selection rectangle
    this.#stage.on("mousedown touchstart", (e) => {
      if (e.target !== this.#stage && e.target !== this.#pageRect) return;

      const pos = this.#stage.getPointerPosition();
      if (!pos) return;
      // Convert to world coords
      const world = this.screenToWorld(pos);
      x1 = world.x;
      y1 = world.y;
      x2 = world.x;
      y2 = world.y;
      selecting = true;

      this.#selectionRect.setAttrs({
        x: x1,
        y: y1,
        width: 0,
        height: 0,
        visible: true,
      });
    });

    this.#stage.on("mousemove touchmove", () => {
      if (!selecting) return;

      const pos = this.#stage.getPointerPosition();
      if (!pos) return;
      const world = this.screenToWorld(pos);
      x2 = world.x;
      y2 = world.y;

      this.#selectionRect.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
      this.#uiLayer.batchDraw();
    });

    this.#stage.on("mouseup touchend", () => {
      if (!selecting) return;
      selecting = false;

      // Find blocks that intersect the selection rectangle
      if (this.#selectionRect.width() > 2 && this.#selectionRect.height() > 2) {
        const selBox = this.#selectionRect.getClientRect();
        const selectedIds: number[] = [];
        for (const [blockId, node] of this.#nodeMap) {
          if (Konva.Util.haveIntersection(selBox, node.getClientRect())) {
            selectedIds.push(blockId);
          }
        }
        if (selectedIds.length > 0) {
          // Fire click with multi-select
          for (const id of selectedIds) {
            this.onBlockClick?.(id, { shiftKey: true });
          }
        }
      }

      setTimeout(() => {
        this.#selectionRect.visible(false);
        this.#uiLayer.batchDraw();
      });
    });
  }
}
