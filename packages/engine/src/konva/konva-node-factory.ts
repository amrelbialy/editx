import Konva from "konva";
import type { BlockData } from "../block/block.types";
import {
  OPACITY,
  POSITION_X,
  POSITION_Y,
  ROTATION,
  SIZE_HEIGHT,
  SIZE_WIDTH,
  VISIBLE,
} from "../block/property-keys";
import { FormattedText } from "./formatted-text";
import { updateImageNode, updateTextNode } from "./konva-image-text-updaters";
import { createPageNode, updatePageNode } from "./konva-page-node";
import {
  updateArrowNode,
  updateEllipseNode,
  updatePolygonNode,
  updateRectNode,
  updateStarNode,
} from "./konva-shape-updaters";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export interface NodeCallbacks {
  onDragEnd: (id: number, x: number, y: number) => void;
  onTransformEnd: (
    id: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
  getActiveAnchor?: () => string;
}

/**
 * Creates and updates Konva nodes for block data.
 */
export class KonvaNodeFactory {
  #stage: Konva.Stage;
  #webgl: WebGLFilterRenderer | null;

  constructor(stage: Konva.Stage, webgl?: WebGLFilterRenderer | null) {
    this.#stage = stage;
    this.#webgl = webgl ?? null;
  }

  createNode(
    id: number,
    block: BlockData,
    callbacks: NodeCallbacks,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): Konva.Node | null {
    if (block.type === "page") {
      return createPageNode(id);
    }

    let shapeKind: string = block.kind || "rect";
    if (block.type === "graphic" && block.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) shapeKind = shapeBlock.kind || "rect";
    }

    let node: Konva.Shape;

    if (block.type === "image") {
      node = new Konva.Image({
        name: `block-${id}`,
        draggable: true,
        image: undefined as unknown as CanvasImageSource,
      });
    } else if (block.type === "text") {
      node = new FormattedText({
        name: `block-${id}`,
        draggable: true,
      });
    } else if (shapeKind === "ellipse") {
      node = new Konva.Ellipse({
        name: `block-${id}`,
        draggable: true,
        radiusX: 50,
        radiusY: 50,
      });
    } else if (shapeKind === "polygon") {
      node = new Konva.RegularPolygon({
        name: `block-${id}`,
        draggable: true,
        sides: 5,
        radius: 50,
      });
    } else if (shapeKind === "star") {
      node = new Konva.Star({
        name: `block-${id}`,
        draggable: true,
        numPoints: 5,
        innerRadius: 25,
        outerRadius: 50,
      });
    } else if (shapeKind === "line") {
      node = new Konva.Arrow({
        name: `block-${id}`,
        draggable: true,
        points: [0, 0, 100, 0],
        pointerLength: 10,
        pointerWidth: 10,
      });
    } else {
      node = new Konva.Rect({
        name: `block-${id}`,
        draggable: true,
      });
    }

    node.setAttr("blockId", id);

    const isCenterOrigin = () =>
      node instanceof Konva.RegularPolygon ||
      node instanceof Konva.Star ||
      node instanceof Konva.Ellipse;

    node.on("dragend", () => {
      const pos = node.position();
      if (isCenterOrigin()) {
        const w = node.getAttr("blockWidth") ?? 100;
        const h = node.getAttr("blockHeight") ?? 100;
        callbacks.onDragEnd(id, pos.x - w / 2, pos.y - h / 2);
      } else {
        callbacks.onDragEnd(id, pos.x, pos.y);
      }
    });

    // For text nodes on pill (edge) anchors, reset scale and apply width/height
    // live so the text reflows instead of visually stretching.
    // Corner anchors still scale normally (font sizes are adjusted on transformend).
    if (block.type === "text") {
      const PILL_ANCHORS = new Set(["middle-left", "middle-right", "top-center", "bottom-center"]);
      node.on("transform", () => {
        const anchor = callbacks.getActiveAnchor?.() ?? "";
        if (!PILL_ANCHORS.has(anchor)) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        if (scaleX !== 1 || scaleY !== 1) {
          node.width(node.width() * scaleX);
          node.height(node.height() * scaleY);
          node.scaleX(1);
          node.scaleY(1);
        }
      });
    }

    node.on("transformend", () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const baseW = node.getAttr("blockWidth") ?? node.width();
      const baseH = node.getAttr("blockHeight") ?? node.height();
      const newW = baseW * scaleX;
      const newH = baseH * scaleY;
      const center = isCenterOrigin();
      const result = {
        x: center ? node.x() - newW / 2 : node.x(),
        y: center ? node.y() - newH / 2 : node.y(),
        width: newW,
        height: newH,
        rotation: node.rotation(),
      };
      node.scaleX(1);
      node.scaleY(1);
      callbacks.onTransformEnd(id, result);
    });

    return node;
  }

  updateNode(
    node: Konva.Node,
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): { autoHeight?: number } | undefined {
    const props = block.properties;

    if (block.type === "page") {
      updatePageNode(node as Konva.Group, block, this.#stage, this.#webgl, resolveBlock);
      return;
    }

    const x = (props[POSITION_X] as number) ?? 0;
    const y = (props[POSITION_Y] as number) ?? 0;
    const width = (props[SIZE_WIDTH] as number) ?? 100;
    const height = (props[SIZE_HEIGHT] as number) ?? 100;
    const rotation = (props[ROTATION] as number) ?? 0;
    const opacity = (props[OPACITY] as number) ?? 1;
    const visible = (props[VISIBLE] as boolean) ?? true;

    // Center-origin shapes store top-left in engine; convert to center for Konva
    const isCenterOrigin =
      node instanceof Konva.RegularPolygon ||
      node instanceof Konva.Star ||
      node instanceof Konva.Ellipse;
    const nx = isCenterOrigin ? x + width / 2 : x;
    const ny = isCenterOrigin ? y + height / 2 : y;
    node.setAttrs({ x: nx, y: ny, rotation, opacity, visible });

    if (block.type === "image") {
      updateImageNode(
        node as Konva.Image,
        props,
        width,
        height,
        this.#stage,
        this.#webgl,
        block,
        resolveBlock,
      );
      return;
    }

    if (block.type === "text") {
      const result = updateTextNode(
        node as FormattedText,
        props,
        width,
        height,
        block,
        resolveBlock,
      );
      if (result.computedHeight != null) {
        return { autoHeight: result.computedHeight };
      }
      return;
    }

    if (node instanceof Konva.Ellipse) {
      updateEllipseNode(node, props, width, height, block, resolveBlock);
      return;
    }
    if (node instanceof Konva.RegularPolygon) {
      updatePolygonNode(node, props, width, height, block, resolveBlock);
      return;
    }
    if (node instanceof Konva.Star) {
      updateStarNode(node, props, width, height, block, resolveBlock);
      return;
    }
    if (node instanceof Konva.Arrow) {
      updateArrowNode(node, props, width, height, block, resolveBlock);
      return;
    }
    if (node instanceof Konva.Rect) {
      updateRectNode(node, props, width, height, block, resolveBlock);
    }
  }
}
