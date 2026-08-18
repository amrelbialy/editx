import Konva from "konva";
import type { KonvaCamera } from "./konva-camera";
import { resolveHit } from "./konva-context-resolver";

/**
 * Manages a dashed rectangle on the UI layer that highlights
 * the block under the cursor (when not already selected).
 */
export class KonvaHoverOutline {
  #rect: Konva.Rect;
  #contentLayer: Konva.Layer;
  #uiLayer: Konva.Layer;
  #transformer: Konva.Transformer;
  #camera: KonvaCamera;
  #hoveredBlockId: number | null = null;

  constructor(
    uiLayer: Konva.Layer,
    contentLayer: Konva.Layer,
    transformer: Konva.Transformer,
    camera: KonvaCamera,
    private readonly getGroupContext: () => number[],
    accentColor: string,
    private readonly isEnabled: () => boolean = () => true,
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
  bind(node: Konva.Node): void {
    if (node.getAttr("isPage")) return;

    node.on("mouseenter", (event) => {
      if (!this.isEnabled()) {
        this.#hideAndDraw();
        return;
      }
      const resolved = resolveHit(event.target as Konva.Node, this.getGroupContext());
      if (!resolved || resolved.node.getAttr("isPage")) return;
      if (this.#transformer.nodes().includes(resolved.node)) {
        this.#hideAndDraw();
        return;
      }
      this.#hoveredBlockId = resolved.blockId;
      this.#show(resolved.node);
    });

    node.on("mouseleave", (event) => {
      const resolved = resolveHit(event.target as Konva.Node, this.getGroupContext());
      if (resolved?.blockId === this.#hoveredBlockId) this.#hideAndDraw();
    });

    node.on("dragstart", () => {
      this.#hideAndDraw();
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
    const bounds = node.getClientRect({ relativeTo: this.#contentLayer });

    this.#rect.setAttrs({
      ...bounds,
      rotation: 0,
      visible: true,
      strokeWidth: 2 / this.#camera.getZoom(),
    });
    this.#rect.moveToTop();
    this.#transformer.moveToTop();
    this.#uiLayer.batchDraw();
  }

  #hideAndDraw(): void {
    this.#hoveredBlockId = null;
    this.#rect.visible(false);
    this.#uiLayer.batchDraw();
  }
}
