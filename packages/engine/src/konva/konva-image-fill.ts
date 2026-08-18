import type Konva from "konva";
import type { BlockData, ImageFillAlignment, ImageFillFit } from "../block/block.types";
import {
  FILL_IMAGE_ALIGNMENT,
  FILL_IMAGE_FIT,
  FILL_IMAGE_FLIP_HORIZONTAL,
  FILL_IMAGE_FLIP_VERTICAL,
  FILL_IMAGE_OFFSET_X,
  FILL_IMAGE_OFFSET_Y,
  FILL_IMAGE_ROTATION,
  FILL_IMAGE_SCALE,
  FILL_IMAGE_SRC,
} from "../block/property-keys";
import {
  getImageFillAlignmentDisplacement,
  getImageFillPatternScale,
} from "../editor/image-fill-crop-math";
import { loadImage } from "../utils/image-loader";
import { processImageSource, resolveImageEffects } from "./konva-image-effects";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

interface FillBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PatternSource = HTMLImageElement | HTMLCanvasElement;

export function invalidatePendingImageFill(node: Konva.Shape): void {
  if (typeof node.setAttr !== "function") return;
  node.setAttr("__fillImageRequest", undefined);
  node.setAttr("__pendingFillSrc", undefined);
}

export function computePatternScale(
  fit: ImageFillFit,
  box: FillBox,
  source: PatternSource,
  userScale: number,
  rotation = 0,
): { x: number; y: number } {
  return getImageFillPatternScale(
    {
      boxWidth: box.width,
      boxHeight: box.height,
      imageWidth: source.width || 1,
      imageHeight: source.height || 1,
    },
    fit,
    userScale,
    rotation,
  );
}

export function applyImagePatternTransform(
  node: Konva.Shape,
  source: PatternSource,
  fit: ImageFillFit,
  box: FillBox,
  options: {
    alignment?: ImageFillAlignment;
    offsetX: number;
    offsetY: number;
    scale: number;
    rotation: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  },
): void {
  const patternScale = computePatternScale(fit, box, source, options.scale, options.rotation);
  const scaleX = patternScale.x * (options.flipHorizontal ? -1 : 1);
  const scaleY = patternScale.y * (options.flipVertical ? -1 : 1);
  const centerX = (source.width || 1) / 2;
  const centerY = (source.height || 1) / 2;
  const alignment = getImageFillAlignmentDisplacement(
    {
      boxWidth: box.width,
      boxHeight: box.height,
      imageWidth: source.width || 1,
      imageHeight: source.height || 1,
    },
    fit,
    options.alignment,
    options.scale,
    options.rotation,
  );

  node.fillPatternImage(source);
  node.setAttr("__fillPatternSource", source);
  node.setAttr("__fillPatternFit", fit);
  node.fillPatternScale({ x: scaleX, y: scaleY });
  node.fillPatternRotation(options.rotation);
  node.fillPatternOffset({ x: centerX + options.offsetX, y: centerY + options.offsetY });
  node.fillPatternX(box.x + box.width / 2 + alignment.x);
  node.fillPatternY(box.y + box.height / 2 + alignment.y);
}

function processFillSource(
  node: Konva.Shape,
  source: HTMLImageElement,
  block: BlockData,
  webgl: WebGLFilterRenderer | null,
  resolveBlock?: (id: number) => BlockData | undefined,
): PatternSource {
  const effects = resolveImageEffects(block, resolveBlock);
  const lastSource = node.getAttr("__fillEffectSource") as HTMLImageElement | undefined;
  const lastKey = node.getAttr("__fillEffectKey") as string | undefined;
  const cached = node.getAttr("__fillProcessedImage") as PatternSource | undefined;
  if (lastSource === source && lastKey === effects.key && cached) return cached;

  const ownedCanvas = node.getAttr("__fillEffectCanvas") as HTMLCanvasElement | undefined;
  const processed = processImageSource(source, effects, webgl, ownedCanvas);
  if (processed !== source) node.setAttr("__fillEffectCanvas", processed);
  node.setAttr("__fillEffectSource", source);
  node.setAttr("__fillEffectKey", effects.key);
  node.setAttr("__fillProcessedImage", processed);
  return processed;
}

export function applyImageFill(
  node: Konva.Shape,
  fillBlock: BlockData,
  block: BlockData,
  box: FillBox,
  webgl: WebGLFilterRenderer | null,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const src = (fillBlock.properties[FILL_IMAGE_SRC] as string) ?? "";
  if (!src) {
    invalidatePendingImageFill(node);
    node.fillPriority("color");
    node.fillPatternImage(undefined as unknown as HTMLImageElement);
    node.fill("");
    return;
  }

  const fit = (fillBlock.properties[FILL_IMAGE_FIT] as ImageFillFit) ?? "cover";
  const alignment = (fillBlock.properties[FILL_IMAGE_ALIGNMENT] as ImageFillAlignment) ?? "center";
  const offsetX = (fillBlock.properties[FILL_IMAGE_OFFSET_X] as number) ?? 0;
  const offsetY = (fillBlock.properties[FILL_IMAGE_OFFSET_Y] as number) ?? 0;
  const userScale = (fillBlock.properties[FILL_IMAGE_SCALE] as number) ?? 1;
  const rotation = (fillBlock.properties[FILL_IMAGE_ROTATION] as number) ?? 0;
  const flipHorizontal = (fillBlock.properties[FILL_IMAGE_FLIP_HORIZONTAL] as boolean) ?? false;
  const flipVertical = (fillBlock.properties[FILL_IMAGE_FLIP_VERTICAL] as boolean) ?? false;
  const transform = {
    alignment,
    offsetX,
    offsetY,
    scale: userScale,
    rotation,
    flipHorizontal,
    flipVertical,
  };

  node.fillPriority("pattern");
  node.fillPatternRepeat(fit === "tile" ? "repeat" : "no-repeat");

  const rawSource = node.getAttr("__fillSourceImage") as HTMLImageElement | undefined;
  if (rawSource && node.getAttr("__fillLoadedSrc") === src) {
    invalidatePendingImageFill(node);
    const processed = processFillSource(node, rawSource, block, webgl, resolveBlock);
    applyImagePatternTransform(node, processed, fit, box, transform);
    node.setAttr("__fillImageReady", Promise.resolve());
    return;
  }

  const effectKey = resolveImageEffects(block, resolveBlock).key;
  const request = { src, effectKey };
  node.setAttr("__fillImageRequest", request);
  node.setAttr("__pendingFillSrc", src);
  node.setAttr("__fillImageLoadError", undefined);
  const imageReady = loadImage(src)
    .then((source) => {
      if (node.getAttr("__fillImageRequest") !== request || !node.getStage()) return;
      const processed = processFillSource(node, source, block, webgl, resolveBlock);
      node.setAttr("__fillSourceImage", source);
      node.setAttr("__fillLoadedSrc", src);
      applyImagePatternTransform(node, processed, fit, box, transform);
      node.getLayer()?.batchDraw();
    })
    .catch((error: unknown) => {
      if (node.getAttr("__fillImageRequest") !== request) return;
      node.setAttr("__fillImageLoadError", error);
      console.error(`[editx] Failed to load fill image: ${src}`, error);
    });
  node.setAttr("__fillImageReady", imageReady);
}
