import type Konva from "konva";
import type {
  BlockData,
  Color,
  GradientStop,
  GradientType,
  ImageFillFit,
} from "../block/block.types";
import {
  FILL_COLOR,
  FILL_ENABLED,
  FILL_GRADIENT_ANGLE,
  FILL_GRADIENT_STOPS,
  FILL_GRADIENT_TYPE,
  FILL_IMAGE_FIT,
  FILL_IMAGE_OFFSET_X,
  FILL_IMAGE_OFFSET_Y,
  FILL_IMAGE_SCALE,
  FILL_IMAGE_SRC,
  FILL_SOLID_COLOR,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import { loadImage } from "../utils/image-loader";
import { applyStrokeAndShadow } from "./konva-stroke-shadow";

/**
 * Bounding box of a shape in its own local coordinate space. Rect/arrow are
 * top-left anchored ({x:0,y:0}); ellipse/polygon/star are centered
 * ({x:-w/2,y:-h/2}). Gradient endpoints and pattern alignment are derived from it.
 */
export interface FillBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Resolve fill + stroke + shadow from sub-blocks (or fall back to block properties). */
export function applyShapeFillStroke(
  node: Konva.Shape,
  props: Record<string, unknown>,
  box: FillBox,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  applyFill(node, props, box, block, resolveBlock);
  applyStrokeAndShadow(node, props, box);
}

function applyFill(
  node: Konva.Shape,
  props: Record<string, unknown>,
  box: FillBox,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const fillEnabled = (props[FILL_ENABLED] as boolean) ?? true;
  node.fillEnabled(fillEnabled);
  if (!fillEnabled) {
    return;
  }

  const fillBlock = block?.fillId != null && resolveBlock ? resolveBlock(block.fillId) : undefined;
  const kind = fillBlock?.kind;

  if (fillBlock && kind === "gradient") {
    applyGradientFill(node, fillBlock, box);
    return;
  }
  if (fillBlock && kind === "image") {
    applyImageFill(node, fillBlock, box);
    return;
  }

  let fillColor: Color | undefined;
  if (fillBlock) {
    const c = fillBlock.properties[FILL_SOLID_COLOR];
    if (c && typeof c === "object") fillColor = c as Color;
  }
  if (!fillColor) {
    const fc = props[FILL_COLOR];
    if (fc && typeof fc === "object") fillColor = fc as Color;
  }
  setColorFill(node, fillColor ? colorToHex(fillColor) : "");
}

function setColorFill(node: Konva.Shape, hex: string): void {
  node.fillPriority("color");
  node.fillPatternImage(undefined as unknown as HTMLImageElement);
  node.fill(hex);
}

// ── Gradient resolution ────────────────────────────────────────────

function flattenStops(stops: GradientStop[]): Array<number | string> {
  const out: Array<number | string> = [];
  for (const s of stops) out.push(s.offset, s.color);
  return out;
}

function applyGradientFill(node: Konva.Shape, fillBlock: BlockData, box: FillBox): void {
  const type = (fillBlock.properties[FILL_GRADIENT_TYPE] as GradientType) ?? "linear";
  const stopsRaw = fillBlock.properties[FILL_GRADIENT_STOPS];
  const stops = Array.isArray(stopsRaw) ? (stopsRaw as GradientStop[]) : [];
  const colorStops = flattenStops(stops);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (type === "radial") {
    const radius = Math.hypot(box.width / 2, box.height / 2);
    node.fillPriority("radial-gradient");
    node.fillRadialGradientStartPoint({ x: cx, y: cy });
    node.fillRadialGradientStartRadius(0);
    node.fillRadialGradientEndPoint({ x: cx, y: cy });
    node.fillRadialGradientEndRadius(radius);
    node.fillRadialGradientColorStops(colorStops);
    return;
  }

  const angle = (fillBlock.properties[FILL_GRADIENT_ANGLE] as number) ?? 0;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // Half-length from center to the box edge along the gradient direction so the
  // ramp spans the full bounding box regardless of angle.
  const len = (Math.abs(dx) * box.width) / 2 + (Math.abs(dy) * box.height) / 2;
  node.fillPriority("linear-gradient");
  node.fillLinearGradientStartPoint({ x: cx - dx * len, y: cy - dy * len });
  node.fillLinearGradientEndPoint({ x: cx + dx * len, y: cy + dy * len });
  node.fillLinearGradientColorStops(colorStops);
}

// ── Image (pattern) resolution ─────────────────────────────────────

function computePatternScale(
  fit: ImageFillFit,
  box: FillBox,
  img: HTMLImageElement,
  userScale: number,
): { x: number; y: number } {
  const iw = img.width || 1;
  const ih = img.height || 1;
  let sx = 1;
  let sy = 1;
  if (fit === "cover") sx = sy = Math.max(box.width / iw, box.height / ih);
  else if (fit === "contain") sx = sy = Math.min(box.width / iw, box.height / ih);
  else if (fit === "stretch") {
    sx = box.width / iw;
    sy = box.height / ih;
  }
  return { x: sx * userScale, y: sy * userScale };
}

function applyImageFill(node: Konva.Shape, fillBlock: BlockData, box: FillBox): void {
  const src = (fillBlock.properties[FILL_IMAGE_SRC] as string) ?? "";
  if (!src) {
    setColorFill(node, "");
    return;
  }
  const fit = (fillBlock.properties[FILL_IMAGE_FIT] as ImageFillFit) ?? "cover";
  const offsetX = (fillBlock.properties[FILL_IMAGE_OFFSET_X] as number) ?? 0;
  const offsetY = (fillBlock.properties[FILL_IMAGE_OFFSET_Y] as number) ?? 0;
  const userScale = (fillBlock.properties[FILL_IMAGE_SCALE] as number) ?? 1;

  node.fillPriority("pattern");
  node.fillPatternRepeat(fit === "tile" ? "repeat" : "no-repeat");
  node.fillPatternOffset({ x: offsetX, y: offsetY });
  node.fillPatternX(box.x);
  node.fillPatternY(box.y);

  const cached = node.getAttr("__fillImage") as HTMLImageElement | undefined;
  if (cached && node.getAttr("__fillLoadedSrc") === src) {
    node.fillPatternImage(cached);
    node.fillPatternScale(computePatternScale(fit, box, cached, userScale));
    return;
  }

  // Track the most recent requested src so a stale async load can't clobber a
  // newer one when it resolves out of order (mirrors updateImageNode).
  node.setAttr("__pendingFillSrc", src);
  node.setAttr("__fillImageLoadError", undefined);
  const imageReady = loadImage(src)
    .then((img) => {
      if (node.getAttr("__pendingFillSrc") !== src) return;
      if (!node.getStage()) return;
      node.setAttr("__fillImage", img);
      node.setAttr("__fillLoadedSrc", src);
      node.fillPatternImage(img);
      node.fillPatternScale(computePatternScale(fit, box, img, userScale));
      node.getLayer()?.batchDraw();
    })
    .catch((error: unknown) => {
      if (node.getAttr("__pendingFillSrc") !== src) return;
      node.setAttr("__fillImageLoadError", error);
      console.error(`[editx] Failed to load fill image: ${src}`, error);
    });
  node.setAttr("__fillImageReady", imageReady);
}
