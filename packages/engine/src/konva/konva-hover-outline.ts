import Konva from "konva";
import type { KonvaCamera } from "./konva-camera";
import { resolveHit } from "./konva-context-resolver";

const ALWAYS_ENABLED = () => true;

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
  #hoveredNode: Konva.Node | null = null;
  #hoverAllowed = ALWAYS_ENABLED;

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
    uiLayer.on("beforeDraw.konvaHoverOutline", () => this.#refresh());
  }

  /** Bind hover events on a block node. Page hover is opt-in for continuous views. */
  bind(node: Konva.Node, allowPageHover: () => boolean = ALWAYS_ENABLED): void {
    const isPage = node.getAttr("isPage") === true;
    node.on("mouseenter", (event) => {
      if (!this.isEnabled()) {
        this.#hideAndDraw();
        return;
      }
      if (isPage) {
        if (!allowPageHover() || this.#transformer.nodes().includes(node)) {
          this.#hideAndDraw();
          return;
        }
        this.#hoveredBlockId = node.getAttr("blockId") as number;
        this.#show(node, allowPageHover);
        return;
      }
      const resolved = resolveHit(event.target as Konva.Node, this.getGroupContext());
      if (!resolved || resolved.node.getAttr("isPage")) return;
      if (this.#transformer.nodes().includes(resolved.node)) {
        this.#hideAndDraw();
        return;
      }
      this.#hoveredBlockId = resolved.blockId;
      this.#show(resolved.node, ALWAYS_ENABLED);
    });

    node.on("mouseleave", (event) => {
      if (isPage) {
        if (node.getAttr("blockId") === this.#hoveredBlockId) this.#hideAndDraw();
        return;
      }
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
    this.#hoveredNode = null;
    this.#rect.visible(false);
  }

  /** Clear hover only when this exact rendered node is being retired. */
  clearNode(node: Konva.Node): void {
    if (this.#hoveredNode === node) this.#hideAndDraw();
  }

  setAccentColor(color: string): void {
    this.#rect.stroke(color);
  }

  #show(node: Konva.Node, allowed: () => boolean): void {
    this.#hoveredNode = node;
    this.#hoverAllowed = allowed;
    this.#refresh();
    this.#rect.moveToTop();
    this.#transformer.moveToTop();
    this.#uiLayer.batchDraw();
  }

  #refresh(): void {
    const node = this.#hoveredNode;
    if (!node || !this.isEnabled() || !this.#hoverAllowed() || !node.isVisible()) {
      this.#rect.visible(false);
      return;
    }
    const bounds = node.getClientRect({ relativeTo: this.#contentLayer });
    this.#rect.setAttrs({
      ...bounds,
      rotation: 0,
      visible: true,
      strokeWidth: 2 / this.#camera.getZoom(),
    });
  }

  #hideAndDraw(): void {
    this.#hoveredBlockId = null;
    this.#hoveredNode = null;
    this.#rect.visible(false);
    this.#uiLayer.batchDraw();
  }
}
