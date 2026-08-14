/** Clamp helpers keeping ShapePropertiesPanel values inside setShapeGeometry's engine bounds. */
import type { ShapeGeometry, ShapeType } from "@editx/engine";

export type NumericShapeKey =
  | "cornerRadius"
  | "sides"
  | "points"
  | "innerDiameter"
  | "pointerLength"
  | "pointerWidth";

interface NumericShapeState {
  kind: ShapeType;
  points: number;
  innerDiameter: number;
  pointerLength: number;
  pointerWidth: number;
}

function clampCornerRadius(value: number): number {
  return Math.max(0, value);
}

function clampPolygonSides(value: number): number {
  return Math.max(3, Math.round(value));
}

function clampStarPoints(value: number): number {
  return Math.max(2, Math.round(value));
}

function clampInnerDiameter(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampPointerLength(value: number): number {
  return Math.max(0, value);
}

function clampPointerWidth(value: number): number {
  return Math.max(0, value);
}

/** Builds a clamped `ShapeGeometry` patch for the state's kind, or `null` if it has no numeric params. */
export function buildClampedGeometry(
  state: NumericShapeState,
  key: NumericShapeKey,
  value: number,
): ShapeGeometry | null {
  switch (state.kind) {
    case "rect":
      return { type: "rect", cornerRadius: clampCornerRadius(value) };
    case "polygon":
      return { type: "polygon", sides: clampPolygonSides(value) };
    case "star":
      return {
        type: "star",
        points: clampStarPoints(key === "points" ? value : state.points),
        innerDiameter: clampInnerDiameter(key === "innerDiameter" ? value : state.innerDiameter),
      };
    case "line":
      return {
        type: "line",
        pointerLength: clampPointerLength(key === "pointerLength" ? value : state.pointerLength),
        pointerWidth: clampPointerWidth(key === "pointerWidth" ? value : state.pointerWidth),
      };
    default:
      return null;
  }
}
