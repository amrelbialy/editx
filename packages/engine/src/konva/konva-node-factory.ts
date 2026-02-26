import Konva from 'konva';
import type { BlockData, Color } from '../block/block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  IMAGE_SRC,
} from '../block/property-keys';
import { colorToHex } from '../utils/color';
import { loadImage } from '../utils/image-loader';

export interface NodeCallbacks {
  onDragEnd: (id: number, x: number, y: number) => void;
  onTransformEnd: (
    id: number,
    transform: { x: number; y: number; width: number; height: number; rotation: number },
  ) => void;
}

/**
 * Creates and updates Konva nodes for block data.
 */
export class KonvaNodeFactory {
  #stage: Konva.Stage;

  constructor(stage: Konva.Stage) {
    this.#stage = stage;
  }

  createNode(id: number, block: BlockData, callbacks: NodeCallbacks): Konva.Node | null {
    const kind = block.kind || 'rect';
    let node: Konva.Shape;

    if (block.type === 'image') {
      node = new Konva.Image({
        name: `block-${id}`,
        draggable: false,
        image: undefined as unknown as CanvasImageSource,
      });
    } else if (block.type === 'text') {
      node = new Konva.Text({
        name: `block-${id}`,
        draggable: true,
      });
    } else if (kind === 'ellipse') {
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

    node.setAttr('blockId', id);

    node.on('dragend', () => {
      const pos = node.position();
      callbacks.onDragEnd(id, pos.x, pos.y);
    });

    node.on('transformend', () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      callbacks.onTransformEnd(id, {
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

  updateNode(node: Konva.Node, block: BlockData): void {
    const props = block.properties;

    const x = (props[POSITION_X] as number) ?? 0;
    const y = (props[POSITION_Y] as number) ?? 0;
    const width = (props[SIZE_WIDTH] as number) ?? 100;
    const height = (props[SIZE_HEIGHT] as number) ?? 100;
    const rotation = (props[ROTATION] as number) ?? 0;
    const opacity = (props[OPACITY] as number) ?? 1;
    const visible = (props[VISIBLE] as boolean) ?? true;

    node.setAttrs({ x, y, rotation, opacity, visible });

    if (block.type === 'image') {
      this.#updateImageNode(node as Konva.Image, props, width, height);
      return;
    }

    if (block.type === 'text') {
      this.#updateTextNode(node as Konva.Text, props, width);
      return;
    }

    if (node instanceof Konva.Ellipse) {
      this.#updateEllipseNode(node, props, width, height);
      return;
    }

    if (node instanceof Konva.Rect) {
      this.#updateRectNode(node, props, width, height);
    }
  }

  // --- Per-type updaters ---

  #updateImageNode(
    imgNode: Konva.Image,
    props: Record<string, unknown>,
    width: number,
    height: number,
  ): void {
    imgNode.width(width);
    imgNode.height(height);
    const src = (props[IMAGE_SRC] as string) ?? '';
    if (src && imgNode.getAttr('loadedSrc') !== src) {
      imgNode.setAttr('loadedSrc', src);
      loadImage(src).then((htmlImg) => {
        imgNode.image(htmlImg);
        this.#stage?.batchDraw();
      });
    }
  }

  #updateTextNode(textNode: Konva.Text, props: Record<string, unknown>, width: number): void {
    textNode.text((props[TEXT_CONTENT] as string) ?? 'Text');
    textNode.fontSize((props[FONT_SIZE] as number) ?? 24);
    textNode.fontFamily((props[FONT_FAMILY] as string) ?? 'Arial');
    textNode.width(width);
    const fillColor = props[FILL_COLOR];
    if (fillColor && typeof fillColor === 'object') {
      textNode.fill(colorToHex(fillColor as Color));
    }
  }

  #updateEllipseNode(
    node: Konva.Ellipse,
    props: Record<string, unknown>,
    width: number,
    height: number,
  ): void {
    node.radiusX(width / 2);
    node.radiusY(height / 2);
    const fillColor = props[FILL_COLOR];
    if (fillColor && typeof fillColor === 'object') {
      node.fill(colorToHex(fillColor as Color));
    }
    const strokeColor = props[STROKE_COLOR];
    if (strokeColor && typeof strokeColor === 'object') {
      node.stroke(colorToHex(strokeColor as Color));
      node.strokeWidth((props[STROKE_WIDTH] as number) ?? 0);
    }
  }

  #updateRectNode(
    node: Konva.Rect,
    props: Record<string, unknown>,
    width: number,
    height: number,
  ): void {
    node.width(width);
    node.height(height);
    const fillColor = props[FILL_COLOR];
    if (fillColor && typeof fillColor === 'object') {
      node.fill(colorToHex(fillColor as Color));
    }
    const strokeColor = props[STROKE_COLOR];
    if (strokeColor && typeof strokeColor === 'object') {
      node.stroke(colorToHex(strokeColor as Color));
      node.strokeWidth((props[STROKE_WIDTH] as number) ?? 0);
    }
  }
}
