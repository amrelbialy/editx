import Konva from "konva";
import type { KonvaCamera } from "./konva-camera";

/**
 * Manages a dashed rectangle on the UI layer that highlights
 * the block under the cursor (when not already selected).
 */
export class KonvaHoverOutline {
  #rect: Konva.Rect;
  #uiLayer: Konva.Layer;
  #contentLayer: Konva.Layer;
  #transformer: Konva.Transformer;
  #camera: KonvaCamera;
  #hoveredBlockId: number | null = null;

  constructor(
    uiLayer: Konva.Layer,
    contentLayer: Konva.Layer,
    transformer: Konva.Transformer,
    camera: KonvaCamera,
    accentColor: string,
  ) {
    this.#uiLayer = uiLayer;
    this.#contentLayer = contentLayer;
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
    const rect = node.getClientRect({ relativeTo: this.#contentLayer });
    this.#rect.setAttrs({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      visible: true,
      strokeWidth: 2 / this.#camera.getZoom(),
    });
    this.#rect.moveToTop();
    this.#transformer.moveToTop();
    this.#uiLayer.batchDraw();
  }
}
