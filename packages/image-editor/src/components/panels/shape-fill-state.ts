import {
  colorToHex,
  type EditxEngine,
  FILL_SOLID_COLOR,
  type FillType,
  type GradientType,
  type ImageFill,
} from "@editx/engine";
import { toOpaqueHexColor } from "../ui/color-value";

export interface ShapeFillState {
  enabled: boolean;
  kind: FillType;
  solidColor: string;
  opacity: number;
  gradientType: GradientType;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  image: ImageFill;
}

function toHex(color: string): string {
  return color.startsWith("#") ? color.substring(0, 7) : color;
}

export function readShapeFillState(engine: EditxEngine, blockId: number): ShapeFillState {
  const fillId = engine.block.getFill(blockId);
  const kind = (fillId != null ? engine.block.getKind(fillId) : "color") as FillType;
  const solidColor = fillId != null ? engine.block.getColor(fillId, FILL_SOLID_COLOR) : null;
  const gradient = engine.block.getFillGradient(blockId);
  const image = engine.block.getFillImage(blockId);
  return {
    enabled: engine.block.isFillEnabled(blockId),
    kind,
    solidColor: solidColor ? toOpaqueHexColor(colorToHex(solidColor)) : "#3b82f6",
    opacity: engine.block.getOpacity(blockId),
    gradientType: gradient?.type ?? "linear",
    gradientStart: toHex(gradient?.stops[0]?.color ?? "#f97316"),
    gradientEnd: toHex(gradient?.stops[gradient.stops.length - 1]?.color ?? "#ec4899"),
    gradientAngle: gradient?.angle ?? 0,
    image: image ?? { src: "", mode: "crop", offsetX: 0, offsetY: 0, scale: 1 },
  };
}

export function mergeActiveShapeFillState(
  current: ShapeFillState,
  fresh: ShapeFillState,
): ShapeFillState {
  const next = {
    ...current,
    enabled: fresh.enabled,
    kind: fresh.kind,
    opacity: fresh.opacity,
  };
  if (fresh.kind === "color") return { ...next, solidColor: fresh.solidColor };
  if (fresh.kind === "gradient") {
    return {
      ...next,
      gradientType: fresh.gradientType,
      gradientStart: fresh.gradientStart,
      gradientEnd: fresh.gradientEnd,
      gradientAngle: fresh.gradientAngle,
    };
  }
  return { ...next, image: fresh.image };
}
