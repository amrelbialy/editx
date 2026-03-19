import Konva from 'konva';
import type { BlockData, Color, TextRun } from '../block/block.types';
import {
  POSITION_X, POSITION_Y, SIZE_WIDTH, SIZE_HEIGHT, ROTATION,
  OPACITY, VISIBLE,
  FILL_COLOR, STROKE_COLOR, STROKE_WIDTH,
  TEXT_CONTENT, FONT_SIZE, FONT_FAMILY,
  TEXT_RUNS, TEXT_ALIGN, TEXT_LINE_HEIGHT, TEXT_VERTICAL_ALIGN, TEXT_PADDING, TEXT_WRAP,
  IMAGE_SRC,
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_ROTATION,
  IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT,
  EFFECT_ADJUSTMENTS_BRIGHTNESS, EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_CONTRAST, EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_CLARITY, EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_SHADOWS, EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_BLACKS, EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_ADJUSTMENTS_TEMPERATURE, EFFECT_ADJUSTMENTS_SHARPNESS,
  EFFECT_FILTER_NAME,
  FILL_SOLID_COLOR, FILL_ENABLED, STROKE_ENABLED,
  SHAPE_RECT_CORNER_RADIUS, SHAPE_POLYGON_SIDES,
  SHAPE_STAR_POINTS, SHAPE_STAR_INNER_DIAMETER,
  SHAPE_LINE_POINTER_LENGTH, SHAPE_LINE_POINTER_WIDTH,
  SHADOW_ENABLED, SHADOW_COLOR, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_BLUR,
} from '../block/property-keys';
import { colorToHex } from '../utils/color';
import { loadImage } from '../utils/image-loader';
import { buildFilterPipeline, type AdjustmentValues } from './filters/build-filter-pipeline';
import { getFilterPreset } from './filters/presets';
import { FormattedText } from './formatted-text';
import type { WebGLFilterRenderer, FilterParams } from './webgl-filter-renderer';

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
    // --- Page block: wrapped in a non-draggable Group ---
    if (block.type === 'page') {
      return this.#createPageNode(id);
    }

    // Resolve the shape sub-block's kind for graphic blocks
    let shapeKind: string = block.kind || 'rect';
    if (block.type === 'graphic' && block.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) shapeKind = shapeBlock.kind || 'rect';
    }

    let node: Konva.Shape;

    if (block.type === 'image') {
      node = new Konva.Image({
        name: `block-${id}`,
        draggable: true,
        image: undefined as unknown as CanvasImageSource,
      });
    } else if (block.type === 'text') {
      node = new FormattedText({
        name: `block-${id}`,
        draggable: true,
      });
    } else if (shapeKind === 'ellipse') {
      node = new Konva.Ellipse({
        name: `block-${id}`,
        draggable: true,
        radiusX: 50,
        radiusY: 50,
      });
    } else if (shapeKind === 'polygon') {
      node = new Konva.RegularPolygon({
        name: `block-${id}`,
        draggable: true,
        sides: 5,
        radius: 50,
      });
    } else if (shapeKind === 'star') {
      node = new Konva.Star({
        name: `block-${id}`,
        draggable: true,
        numPoints: 5,
        innerRadius: 25,
        outerRadius: 50,
      });
    } else if (shapeKind === 'line') {
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

    node.setAttr('blockId', id);

    node.on('dragend', () => {
      const pos = node.position();
      callbacks.onDragEnd(id, pos.x, pos.y);
    });

    node.on('transformend', () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      // Arrow nodes store logical block dimensions since Konva computes
      // width/height from points (which can give 0 height for horizontal arrows).
      const baseW = node.getAttr('blockWidth') ?? node.width();
      const baseH = node.getAttr('blockHeight') ?? node.height();
      callbacks.onTransformEnd(id, {
        x: node.x(),
        y: node.y(),
        width: baseW * scaleX,
        height: baseH * scaleY,
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    });

    return node;
  }

  updateNode(
    node: Konva.Node,
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    const props = block.properties;

    // Page blocks use PAGE_WIDTH/PAGE_HEIGHT and are always at origin
    if (block.type === 'page') {
      this.#updatePageNode(node as Konva.Group, block, resolveBlock);
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
      this.#updateImageNode(node as Konva.Image, props, width, height, block, resolveBlock);
      return;
    }

    if (block.type === 'text') {
      this.#updateTextNode(node as FormattedText, props, width, height);
      return;
    }

    if (node instanceof Konva.Ellipse) {
      this.#updateEllipseNode(node, props, width, height, block, resolveBlock);
      return;
    }

    if (node instanceof Konva.RegularPolygon) {
      this.#updatePolygonNode(node, props, width, height, block, resolveBlock);
      return;
    }

    if (node instanceof Konva.Star) {
      this.#updateStarNode(node, props, width, height, block, resolveBlock);
      return;
    }

    if (node instanceof Konva.Arrow) {
      this.#updateArrowNode(node, props, width, height, block, resolveBlock);
      return;
    }

    if (node instanceof Konva.Rect) {
      this.#updateRectNode(node, props, width, height, block, resolveBlock);
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

  #updatePageNode(
    group: Konva.Group,
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
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
      // Image mode — show both bgRect (transparent, for Transformer bounds) + image
      bgRect.visible(true);
      bgRect.fill('transparent');
      imgNode.visible(true);

      const imageRotation = (props[IMAGE_ROTATION] as number) ?? 0;

      // Source (pre-rotation) image dimensions.
      // For 90°/270° rotations the EditorAPI swaps PAGE_WIDTH/HEIGHT, so
      // reverse-swap them to get the source dims. For arbitrary angles
      // PAGE_WIDTH/HEIGHT are not swapped, so they ARE the source dims.
      const origW = (props[IMAGE_ORIGINAL_WIDTH] as number) ?? 0;
      const origH = (props[IMAGE_ORIGINAL_HEIGHT] as number) ?? 0;

      let sourceW: number;
      let sourceH: number;
      if (origW > 0 && origH > 0) {
        sourceW = origW;
        sourceH = origH;
      } else {
        const isSwapAngle = Math.abs(Math.round(imageRotation / 90)) % 2 === 1;
        sourceW = isSwapAngle ? pageH : pageW;
        sourceH = isSwapAngle ? pageW : pageH;
      }

      imgNode.width(sourceW);
      imgNode.height(sourceH);

      // Apply crop (source-space coordinates, independent of display rotation)
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

      // Flip + rotation around page centre
      const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
      const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;
      imgNode.rotation(imageRotation);
      imgNode.scaleX(flipH ? -1 : 1);
      imgNode.scaleY(flipV ? -1 : 1);
      imgNode.offsetX(sourceW / 2);
      imgNode.offsetY(sourceH / 2);
      imgNode.x(pageW / 2);
      imgNode.y(pageH / 2);

      // Size the bgRect to match the page dimensions — this provides
      // a stable bounding box for the Konva Transformer.
      bgRect.width(pageW);
      bgRect.height(pageH);

      // Load image
      if (imgNode.getAttr('loadedSrc') !== src) {
        imgNode.setAttr('loadedSrc', src);
        loadImage(src).then((htmlImg) => {
          imgNode.setAttr('_sourceImage', htmlImg);
          imgNode.image(htmlImg);
          // Re-apply cache after image loads if filters are active
          if (imgNode.filters()?.length) {
            imgNode.cache();
          }
          this.#stage?.batchDraw();
        });
      }

      // Apply filters from effect blocks
      this.#applyFilters(imgNode, block, resolveBlock);
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

  // --- Filter helpers ---

  #applyFilters(
    imgNode: Konva.Image,
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    const values = this.#collectAdjustmentValues(block, resolveBlock);
    const presetName = this.#collectFilterPresetName(block, resolveBlock);
    const hasAdjustments = values != null;
    const hasPreset = presetName !== '';

    const _perf = typeof window !== 'undefined' && (window as any).__CE_PERF;

    if (!hasAdjustments && !hasPreset) {
      if (_perf) console.log('[perf:applyFilters] no adjustments/preset, skipping');
      // No adjustments and no filter — clear any existing filters/image override
      if (imgNode.filters()?.length) {
        imgNode.filters([]);
        imgNode.clearCache();
      }
      // Restore original image if we previously set a WebGL-rendered canvas
      const orig = imgNode.getAttr('_sourceImage') as HTMLImageElement | undefined;
      if (orig && imgNode.image() !== orig) {
        imgNode.image(orig);
      }
      return;
    }

    // ── WebGL path ──
    if (this.#webgl) {
      // Recover _sourceImage if not set (e.g. image loaded before WebGL code deployed)
      let sourceImg = imgNode.getAttr('_sourceImage') as HTMLImageElement | undefined;
      if (!sourceImg) {
        const currentImg = imgNode.image();
        if (_perf) console.log('[perf:applyFilters] _sourceImage missing, imgNode.image() is:', currentImg?.constructor?.name, 'value:', currentImg);
        if (currentImg instanceof HTMLImageElement) {
          sourceImg = currentImg;
          imgNode.setAttr('_sourceImage', sourceImg);
        }
      }
      if (sourceImg) {
        const t0 = typeof window !== 'undefined' && (window as any).__CE_PERF ? performance.now() : 0;
        // Upload source image (only uploads if size changed or first time)
        this.#webgl.uploadImage(sourceImg, sourceImg.naturalWidth, sourceImg.naturalHeight);

        const params: FilterParams = {
          brightness: values?.brightness ?? 0,
          contrast: values?.contrast ?? 0,
          saturation: values?.saturation ?? 0,
          gamma: values?.gamma ?? 0,
          exposure: values?.exposure ?? 0,
          temperature: values?.temperature ?? 0,
          shadows: values?.shadows ?? 0,
          highlights: values?.highlights ?? 0,
          blacks: values?.blacks ?? 0,
          whites: values?.whites ?? 0,
          clarity: values?.clarity ?? 0,
          sharpness: values?.sharpness ?? 0,
          preset: presetName,
        };

        const filteredCanvas = this.#webgl.render(params);

        // Clear any CPU filters and set the GPU-rendered canvas as the image source
        if (imgNode.filters()?.length) {
          imgNode.filters([]);
          imgNode.clearCache();
        }
        imgNode.image(filteredCanvas);
        if (typeof window !== 'undefined' && (window as any).__CE_PERF) {
          console.log(`[perf:applyFilters] WebGL total: ${(performance.now() - t0).toFixed(2)}ms`);
        }
        return;
      }
      if (_perf) console.log('[perf:applyFilters] WebGL path: sourceImg is null, falling through to CPU');
    } else {
      if (_perf) console.log('[perf:applyFilters] #webgl is null, using CPU fallback');
    }

    // ── CPU fallback path ──
    if (_perf) console.log('[perf:applyFilters] CPU fallback running');
    const t1 = _perf ? performance.now() : 0;
    const filterPresetFn = presetName ? getFilterPreset(presetName) ?? null : null;

    const allFilters: Array<(imageData: ImageData) => void> = [];

    // Adjustments first
    if (values) {
      const pipeline = buildFilterPipeline(values);
      if (pipeline.hasFilters) {
        for (const [key, val] of Object.entries(pipeline.attrs)) {
          imgNode.setAttr(key, val);
        }
        allFilters.push(...(pipeline.filters as Array<(imageData: ImageData) => void>));
      }
    }

    // Filter preset on top
    if (filterPresetFn) {
      allFilters.push(filterPresetFn);
    }

    if (allFilters.length === 0) {
      if (imgNode.filters()?.length) {
        imgNode.filters([]);
        imgNode.clearCache();
      }
      return;
    }

    imgNode.filters(allFilters as any);

    // cache() is required for Konva filters to work — only if image is loaded
    if (imgNode.image()) {
      imgNode.cache();
    }
    if (_perf) console.log(`[perf:applyFilters] CPU fallback total: ${(performance.now() - t1).toFixed(2)}ms (${allFilters.length} filters)`);
  }

  /** Collect adjustment values from all adjustments-type effect blocks. */
  #collectAdjustmentValues(
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): AdjustmentValues | null {
    if (!resolveBlock || block.effectIds.length === 0) return null;

    // Find the first adjustments effect (typically there's only one)
    for (const effectId of block.effectIds) {
      const effectBlock = resolveBlock(effectId);
      if (!effectBlock || effectBlock.kind !== 'adjustments') continue;

      const p = effectBlock.properties;
      return {
        brightness: (p[EFFECT_ADJUSTMENTS_BRIGHTNESS] as number) ?? 0,
        saturation: (p[EFFECT_ADJUSTMENTS_SATURATION] as number) ?? 0,
        contrast: (p[EFFECT_ADJUSTMENTS_CONTRAST] as number) ?? 0,
        gamma: (p[EFFECT_ADJUSTMENTS_GAMMA] as number) ?? 0,
        clarity: (p[EFFECT_ADJUSTMENTS_CLARITY] as number) ?? 0,
        exposure: (p[EFFECT_ADJUSTMENTS_EXPOSURE] as number) ?? 0,
        shadows: (p[EFFECT_ADJUSTMENTS_SHADOWS] as number) ?? 0,
        highlights: (p[EFFECT_ADJUSTMENTS_HIGHLIGHTS] as number) ?? 0,
        blacks: (p[EFFECT_ADJUSTMENTS_BLACKS] as number) ?? 0,
        whites: (p[EFFECT_ADJUSTMENTS_WHITES] as number) ?? 0,
        temperature: (p[EFFECT_ADJUSTMENTS_TEMPERATURE] as number) ?? 0,
        sharpness: (p[EFFECT_ADJUSTMENTS_SHARPNESS] as number) ?? 0,
      };
    }

    return null;
  }

  /** Collect filter preset name from the first filter-type effect block. */
  #collectFilterPresetName(
    block: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): string {
    if (!resolveBlock || block.effectIds.length === 0) return '';

    for (const effectId of block.effectIds) {
      const effectBlock = resolveBlock(effectId);
      if (!effectBlock || effectBlock.kind !== 'filter') continue;

      return (effectBlock.properties[EFFECT_FILTER_NAME] as string) ?? '';
    }

    return '';
  }

  // --- Per-type updaters ---

  #updateImageNode(
    imgNode: Konva.Image,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
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
        imgNode.setAttr('_sourceImage', htmlImg);
        imgNode.image(htmlImg);
        // Re-apply cache after image loads if filters are active
        if (imgNode.filters()?.length) {
          imgNode.cache();
        }
        this.#stage?.batchDraw();
      });
    }

    // Apply filters from effect blocks
    if (block) {
      this.#applyFilters(imgNode, block, resolveBlock);
    }
  }

  #updateTextNode(textNode: FormattedText, props: Record<string, unknown>, width: number, height: number): void {
    // Prefer TEXT_RUNS; fall back to legacy single-style properties
    let runs = props[TEXT_RUNS] as TextRun[] | undefined;
    if (!runs || !Array.isArray(runs) || runs.length === 0) {
      const text = (props[TEXT_CONTENT] as string) ?? 'Text';
      const fillColor = props[FILL_COLOR];
      const fill = fillColor && typeof fillColor === 'object' ? colorToHex(fillColor as Color) : '#000000';
      runs = [{
        text,
        style: {
          fontSize: (props[FONT_SIZE] as number) ?? 24,
          fontFamily: (props[FONT_FAMILY] as string) ?? 'Arial',
          fill,
        },
      }];
    }
    textNode.textRuns(runs);
    textNode.width(width);
    textNode.height(height);
    textNode.align((props[TEXT_ALIGN] as string) ?? 'left');
    textNode.lineHeight((props[TEXT_LINE_HEIGHT] as number) ?? 1.2);
    textNode.verticalAlign((props[TEXT_VERTICAL_ALIGN] as string) ?? 'top');
    textNode.padding((props[TEXT_PADDING] as number) ?? 0);
    textNode.wrap((props[TEXT_WRAP] as string) ?? 'word');
  }

  #updateEllipseNode(
    node: Konva.Ellipse,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    node.radiusX(width / 2);
    node.radiusY(height / 2);
    this.#applyShapeFillStroke(node, props, block, resolveBlock);
  }

  #updateRectNode(
    node: Konva.Rect,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    node.width(width);
    node.height(height);

    // Corner radius from shape sub-block
    let cornerRadius = 0;
    if (block?.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) {
        cornerRadius = (shapeBlock.properties[SHAPE_RECT_CORNER_RADIUS] as number) ?? 0;
      }
    }
    node.cornerRadius(cornerRadius);

    this.#applyShapeFillStroke(node, props, block, resolveBlock);
  }

  #updatePolygonNode(
    node: Konva.RegularPolygon,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    const radius = Math.min(width, height) / 2;
    node.radius(radius);

    let sides = 5;
    if (block?.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) {
        sides = (shapeBlock.properties[SHAPE_POLYGON_SIDES] as number) ?? 5;
      }
    }
    node.sides(sides);

    // Center the polygon in its bounding box
    node.offsetX(0);
    node.offsetY(0);

    this.#applyShapeFillStroke(node, props, block, resolveBlock);
  }

  #updateStarNode(
    node: Konva.Star,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    const outerRadius = Math.min(width, height) / 2;
    let numPoints = 5;
    let innerDiameter = 0.5;

    if (block?.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) {
        numPoints = (shapeBlock.properties[SHAPE_STAR_POINTS] as number) ?? 5;
        innerDiameter = (shapeBlock.properties[SHAPE_STAR_INNER_DIAMETER] as number) ?? 0.5;
      }
    }

    node.numPoints(numPoints);
    node.outerRadius(outerRadius);
    node.innerRadius(outerRadius * innerDiameter);

    this.#applyShapeFillStroke(node, props, block, resolveBlock);
  }

  #updateArrowNode(
    node: Konva.Arrow,
    props: Record<string, unknown>,
    width: number,
    height: number,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    // Arrow line from left-center to right-center of the logical bounding box.
    node.points([0, height / 2, width, height / 2]);

    // Store logical block dimensions so transformend can read them back.
    // Konva.Arrow computes width/height from points, which gives 0 height
    // for horizontal arrows — breaking transform calculations.
    node.setAttr('blockWidth', width);
    node.setAttr('blockHeight', height);

    // Override getSelfRect so the Transformer shows the full bounding box
    // instead of the points-derived rect (which has 0 height).
    node.getSelfRect = () => ({ x: 0, y: 0, width, height });

    let pointerLength = 10;
    let pointerWidth = 10;

    if (block?.shapeId != null && resolveBlock) {
      const shapeBlock = resolveBlock(block.shapeId);
      if (shapeBlock) {
        pointerLength = (shapeBlock.properties[SHAPE_LINE_POINTER_LENGTH] as number) ?? 10;
        pointerWidth = (shapeBlock.properties[SHAPE_LINE_POINTER_WIDTH] as number) ?? 10;
      }
    }

    node.pointerLength(pointerLength);
    node.pointerWidth(pointerWidth);

    // Ensure a generous hit area so the thin line is easy to click
    node.hitStrokeWidth(12);

    this.#applyShapeFillStroke(node, props, block, resolveBlock);
  }

  /** Resolve fill and stroke from sub-blocks (or fall back to block properties). */
  #applyShapeFillStroke(
    node: Konva.Shape,
    props: Record<string, unknown>,
    block?: BlockData,
    resolveBlock?: (id: number) => BlockData | undefined,
  ): void {
    // Resolve fill from sub-block
    let fillColor: Color | undefined;
    let fillEnabled = true;
    let strokeColor: Color | undefined;
    let strokeEnabled = false;
    let strokeW = 0;

    if (block?.fillId != null && resolveBlock) {
      const fillBlock = resolveBlock(block.fillId);
      if (fillBlock) {
        const c = fillBlock.properties[FILL_SOLID_COLOR];
        if (c && typeof c === 'object') fillColor = c as Color;
      }
    }

    // Fill/stroke toggles live on the graphic block
    fillEnabled = (props[FILL_ENABLED] as boolean) ?? true;
    strokeEnabled = (props[STROKE_ENABLED] as boolean) ?? false;

    // Stroke props live on the graphic block
    const sc = props[STROKE_COLOR];
    if (sc && typeof sc === 'object') strokeColor = sc as Color;
    strokeW = (props[STROKE_WIDTH] as number) ?? 0;

    // Fall back to legacy FILL_COLOR if no fill sub-block
    if (!fillColor) {
      const fc = props[FILL_COLOR];
      if (fc && typeof fc === 'object') fillColor = fc as Color;
    }

    // Apply
    if (fillEnabled && fillColor) {
      node.fill(colorToHex(fillColor));
    } else {
      node.fill('');
    }

    if (strokeEnabled && strokeColor && strokeW > 0) {
      node.stroke(colorToHex(strokeColor));
      node.strokeWidth(strokeW);
    } else {
      node.stroke('');
      node.strokeWidth(0);
    }

    // Shadow
    const shadowEnabled = (props[SHADOW_ENABLED] as boolean) ?? false;
    if (shadowEnabled) {
      const sc = props[SHADOW_COLOR];
      node.shadowColor(sc && typeof sc === 'object' ? colorToHex(sc as Color) : 'rgba(0,0,0,0.5)');
      node.shadowOffsetX((props[SHADOW_OFFSET_X] as number) ?? 4);
      node.shadowOffsetY((props[SHADOW_OFFSET_Y] as number) ?? 4);
      node.shadowBlur((props[SHADOW_BLUR] as number) ?? 8);
      node.shadowEnabled(true);
      // Konva needs shadowForStrokeEnabled for proper rendering on stroked shapes
      node.shadowForStrokeEnabled(false);
    } else {
      node.shadowEnabled(false);
    }
  }
}
