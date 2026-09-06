import type Konva from "konva";
import type { BlockData, Color, GradientStop, GradientType } from "../block/block.types";
import {
  FILL_COLOR,
  FILL_ENABLED,
  FILL_GRADIENT_ANGLE,
  FILL_GRADIENT_STOPS,
  FILL_GRADIENT_TYPE,
  FILL_SOLID_COLOR,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import { applyImageFill, invalidatePendingImageFill } from "./konva-image-fill";
import { applyStrokeAndShadow } from "./konva-stroke-shadow";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

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
  webgl: WebGLFilterRenderer | null = null,
): void {
  applyFill(node, props, box, block, resolveBlock, webgl);
  applyStrokeAndShadow(node, props, box);
}

function applyFill(
  node: Konva.Shape,
  props: Record<string, unknown>,
  box: FillBox,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
  webgl: WebGLFilterRenderer | null = null,
): void {
  const fillEnabled = (props[FILL_ENABLED] as boolean) ?? true;
  node.fillEnabled(fillEnabled);
  if (!fillEnabled) {
    invalidatePendingImageFill(node);
    node.fillPatternImage(undefined as unknown as HTMLImageElement);
    node.fill("");
    return;
  }

  const fillBlock = block?.fillId != null && resolveBlock ? resolveBlock(block.fillId) : undefined;
  const kind = fillBlock?.kind;

  if (fillBlock && kind === "gradient") {
    invalidatePendingImageFill(node);
    applyGradientFill(node, fillBlock, box);
    return;
  }
  if (fillBlock && kind === "image") {
    if (!block) return;
    applyImageFill(node, fillBlock, block, box, webgl, resolveBlock);
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
  invalidatePendingImageFill(node);
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
