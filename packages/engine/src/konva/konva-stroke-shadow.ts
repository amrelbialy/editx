import type Konva from "konva";
import type { Color, GradientStop } from "../block/block.types";
import {
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_GRADIENT_ANGLE,
  STROKE_GRADIENT_ENABLED,
  STROKE_GRADIENT_STOPS,
  STROKE_WIDTH,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import type { FillBox } from "./konva-fill";

const flattenStops = (stops: GradientStop[]): Array<number | string> =>
  stops.flatMap((stop) => [stop.offset, stop.color]);

export function applyStrokeAndShadow(
  node: Konva.Shape,
  props: Record<string, unknown>,
  box: FillBox,
): void {
  applyStroke(node, props, box);
  applyShadow(node, props);
}

function applyStroke(node: Konva.Shape, props: Record<string, unknown>, box: FillBox): void {
  const enabled = (props[STROKE_ENABLED] as boolean) ?? false;
  const rawColor = props[STROKE_COLOR];
  const color = rawColor && typeof rawColor === "object" ? (rawColor as Color) : undefined;
  const width = (props[STROKE_WIDTH] as number) ?? 0;
  const rawStops = props[STROKE_GRADIENT_STOPS];
  const stops = Array.isArray(rawStops) ? (rawStops as GradientStop[]) : [];
  const gradientEnabled = (props[STROKE_GRADIENT_ENABLED] as boolean) ?? false;

  node.strokeLinearGradientColorStops(undefined);
  if (enabled && width > 0 && gradientEnabled && stops.length > 0) {
    applyGradientStroke(node, box, width, color, stops, props[STROKE_GRADIENT_ANGLE] as number);
    return;
  }

  if (enabled && color && width > 0) {
    node.stroke(colorToHex(color));
    node.strokeWidth(width);
  } else {
    node.stroke("");
    node.strokeWidth(0);
  }
}

function applyGradientStroke(
  node: Konva.Shape,
  box: FillBox,
  width: number,
  color: Color | undefined,
  stops: GradientStop[],
  angle = 0,
): void {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const length = (Math.abs(dx) * box.width) / 2 + (Math.abs(dy) * box.height) / 2;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  node.stroke(color ? colorToHex(color) : "");
  node.strokeWidth(width);
  node.strokeLinearGradientStartPoint({ x: centerX - dx * length, y: centerY - dy * length });
  node.strokeLinearGradientEndPoint({ x: centerX + dx * length, y: centerY + dy * length });
  node.strokeLinearGradientColorStops(flattenStops(stops));
}

function applyShadow(node: Konva.Shape, props: Record<string, unknown>): void {
  const enabled = (props[SHADOW_ENABLED] as boolean) ?? false;
  if (!enabled) {
    node.shadowEnabled(false);
    return;
  }
  const rawColor = props[SHADOW_COLOR];
  node.shadowColor(
    rawColor && typeof rawColor === "object" ? colorToHex(rawColor as Color) : "rgba(0,0,0,0.5)",
  );
  node.shadowOffsetX((props[SHADOW_OFFSET_X] as number) ?? 4);
  node.shadowOffsetY((props[SHADOW_OFFSET_Y] as number) ?? 4);
  node.shadowBlur((props[SHADOW_BLUR] as number) ?? 8);
  node.shadowEnabled(true);
  node.shadowForStrokeEnabled(false);
}
