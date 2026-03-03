import Konva from 'konva';
import type { BlockData, Color } from '../block/block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  IMAGE_SRC,
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL,
  PAGE_WIDTH, PAGE_HEIGHT,
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
    // --- Page block: wrapped in a non-draggable Group ---
    if (block.type === 'page') {
      return this.#createPageNode(id);
    }

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

    // Page blocks use PAGE_WIDTH/PAGE_HEIGHT and are always at origin
    if (block.type === 'page') {
      this.#updatePageNode(node as Konva.Group, block);
      return;
    }

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

  // --- Page node helpers ---

  #createPageNode(id: number): Konva.Group {
    const group = new Konva.Group({
      name: `block-${id}`,
      draggable: false,
    });
    group.setAttr('blockId', id);
    group.setAttr('isPage', true);

    // Background colour rect (visible when no IMAGE_SRC)
    const bgRect = new Konva.Rect({
      name: 'page-bg',
      fill: '#ffffff',
      listening: true,
    });
    bgRect.setAttr('isPageBackground', true);
    group.add(bgRect);

    // Background image (visible when IMAGE_SRC is set)
    const bgImg = new Konva.Image({
      name: 'page-img',
      image: undefined as unknown as CanvasImageSource,
      visible: false,
      listening: true,
    });
    bgImg.setAttr('isPageBackground', true);
    group.add(bgImg);

    return group;
  }

  #updatePageNode(group: Konva.Group, block: BlockData): void {
    const props = block.properties;
    const pageW = (props[PAGE_WIDTH] as number) ?? 1080;
    const pageH = (props[PAGE_HEIGHT] as number) ?? 1080;
    const opacity = (props[OPACITY] as number) ?? 1;
    const visible = (props[VISIBLE] as boolean) ?? true;
    const src = (props[IMAGE_SRC] as string) ?? '';

    group.setAttrs({ x: 0, y: 0, opacity, visible });

    // Children: [0] = bgRect, [1] = bgImg
    const bgRect = group.children[0] as Konva.Rect;
    const imgNode = group.children[1] as Konva.Image;

    if (src) {
      // Image mode — hide colour rect, show image
      bgRect.visible(false);
      imgNode.visible(true);
      imgNode.width(pageW);
      imgNode.height(pageH);

      // Apply crop
      const cropEnabled = (props[CROP_ENABLED] as boolean) ?? false;
      const cropX = (props[CROP_X] as number) ?? 0;
      const cropY = (props[CROP_Y] as number) ?? 0;
      const cropW = (props[CROP_WIDTH] as number) ?? 0;
      const cropH = (props[CROP_HEIGHT] as number) ?? 0;

      if (cropEnabled && cropW > 0 && cropH > 0) {
        imgNode.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
      } else {
        imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });
      }

      // Flip
      const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
      const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;
      imgNode.scaleX(flipH ? -1 : 1);
      imgNode.scaleY(flipV ? -1 : 1);
      imgNode.offsetX(flipH ? pageW : 0);
      imgNode.offsetY(flipV ? pageH : 0);

      // Load image
      if (imgNode.getAttr('loadedSrc') !== src) {
        imgNode.setAttr('loadedSrc', src);
        loadImage(src).then((htmlImg) => {
          imgNode.image(htmlImg);
          this.#stage?.batchDraw();
        });
      }
    } else {
      // Colour mode — hide image, show rect
      imgNode.visible(false);
      bgRect.visible(true);
      bgRect.width(pageW);
      bgRect.height(pageH);
      const fillColor = props[FILL_COLOR];
      bgRect.fill(
        fillColor && typeof fillColor === 'object'
          ? colorToHex(fillColor as Color)
          : '#ffffff',
      );
    }
  }

  // --- Per-type updaters ---

  #updateImageNode(
    imgNode: Konva.Image,
    props: Record<string, unknown>,
    width: number,
    height: number,
  ): void {
    const cropEnabled = (props[CROP_ENABLED] as boolean) ?? false;
    const cropX = (props[CROP_X] as number) ?? 0;
    const cropY = (props[CROP_Y] as number) ?? 0;
    const cropW = (props[CROP_WIDTH] as number) ?? 0;
    const cropH = (props[CROP_HEIGHT] as number) ?? 0;

    if (cropEnabled && cropW > 0 && cropH > 0) {
      // When cropped, the visible block size is the crop region.
      // The image is offset negatively so the crop region aligns with position.
      imgNode.width(width);
      imgNode.height(height);
      imgNode.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
    } else {
      imgNode.width(width);
      imgNode.height(height);
      // Clear any previous crop
      imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });
    }

    // Apply flip transforms
    const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
    const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;
    imgNode.scaleX(flipH ? -1 : 1);
    imgNode.scaleY(flipV ? -1 : 1);
    if (flipH) imgNode.offsetX(width);
    else imgNode.offsetX(0);
    if (flipV) imgNode.offsetY(height);
    else imgNode.offsetY(0);

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
