import Konva from "konva";
import type { KonvaCamera } from "./konva-camera";

/**
 * Manages a dashed rectangle on the UI layer that highlights
 * the block under the cursor (when not already selected).
 */
export class KonvaHoverOutline {
  #rect: Konva.Rect;
  #uiLayer: Konva.Layer;
  #transformer: Konva.Transformer;
  #camera: KonvaCamera;
  #hoveredBlockId: number | null = null;

  constructor(
    uiLayer: Konva.Layer,
    _contentLayer: Konva.Layer,
    transformer: Konva.Transformer,
    camera: KonvaCamera,
    accentColor: string,
  ) {
    this.#uiLayer = uiLayer;
    this.#transformer = transformer;
    this.#camera = camera;

    this.#rect = new Konva.Rect({
      stroke: accentColor,
      strokeWidth: 2,
      visible: false,
      listening: false,
      perfectDrawEnabled: false,
    });
    uiLayer.add(this.#rect);
  }

  /** Bind hover events on a block node. Skips page nodes. */
  bind(blockId: number, node: Konva.Node): void {
    if (node.getAttr("isPage")) return;

    node.on("mouseenter", () => {
      const selected = this.#transformer.nodes();
      if (selected.includes(node)) return;
      this.#hoveredBlockId = blockId;
      this.#show(node);
    });

    node.on("mouseleave", () => {
      if (this.#hoveredBlockId === blockId) {
        this.#hoveredBlockId = null;
        this.#rect.visible(false);
        this.#uiLayer.batchDraw();
      }
    });

    node.on("dragstart", () => {
      this.#hoveredBlockId = null;
      this.#rect.visible(false);
      this.#uiLayer.batchDraw();
    });
  }

  /** Hide hover outline (e.g. when showing transformer). */
  hide(): void {
    this.#hoveredBlockId = null;
    this.#rect.visible(false);
  }

  setAccentColor(color: string): void {
    this.#rect.stroke(color);
  }

  #show(node: Konva.Node): void {
    const w = node.width();
    const h = node.height();
    // Center-origin shapes (polygon, star, ellipse) position at center;
    // offset to top-left for the hover rect.
    const isCenterOrigin =
      node instanceof Konva.RegularPolygon ||
      node instanceof Konva.Star ||
      node instanceof Konva.Ellipse;
    const x = isCenterOrigin ? node.x() - w / 2 : node.x();
    const y = isCenterOrigin ? node.y() - h / 2 : node.y();

    this.#rect.setAttrs({
      x,
      y,
      width: w,
      height: h,
      rotation: node.rotation(),
      visible: true,
      strokeWidth: 2 / this.#camera.getZoom(),
    });
    this.#rect.moveToTop();
    this.#transformer.moveToTop();
    this.#uiLayer.batchDraw();
  }
}
