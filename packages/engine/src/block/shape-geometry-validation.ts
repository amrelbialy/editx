import type { PathViewBox, ShapeGeometry } from "./block.types";
import { validateSvgPathData } from "./svg-path-validation";

export type NormalizedShapeGeometry =
  | { type: "rect"; cornerRadius: number }
  | { type: "ellipse" }
  | { type: "polygon"; sides: number }
  | { type: "star"; points: number; innerDiameter: number }
  | { type: "line"; pointerLength: number; pointerWidth: number }
  | { type: "path"; name: string; pathData: string; viewBox: PathViewBox };

function finite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function atLeast(value: unknown, minimum: number, label: string): number {
  const number = finite(value, label);
  if (number < minimum) throw new Error(`${label} must be at least ${minimum}`);
  return number;
}

function integerAtLeast(value: unknown, minimum: number, label: string): number {
  const number = atLeast(value, minimum, label);
  if (!Number.isInteger(number)) throw new Error(`${label} must be an integer`);
  return number;
}

export function normalizeShapeGeometry(geometry: ShapeGeometry): NormalizedShapeGeometry {
  if (!geometry || typeof geometry !== "object" || typeof geometry.type !== "string") {
    throw new Error("Unsupported shape geometry");
  }

  switch (geometry.type) {
    case "rect":
      return {
        type: "rect",
        cornerRadius: atLeast(geometry.cornerRadius ?? 0, 0, "cornerRadius"),
      };
    case "ellipse":
      return { type: "ellipse" };
    case "polygon":
      return { type: "polygon", sides: integerAtLeast(geometry.sides ?? 5, 3, "sides") };
    case "star": {
      const innerDiameter = finite(geometry.innerDiameter ?? 0.5, "innerDiameter");
      if (innerDiameter < 0 || innerDiameter > 1) {
        throw new Error("innerDiameter must be between 0 and 1");
      }
      return {
        type: "star",
        points: integerAtLeast(geometry.points ?? 5, 2, "points"),
        innerDiameter,
      };
    }
    case "line":
      return {
        type: "line",
        pointerLength: atLeast(geometry.pointerLength ?? 15, 0, "pointerLength"),
        pointerWidth: atLeast(geometry.pointerWidth ?? 15, 0, "pointerWidth"),
      };
    case "path": {
      if (
        typeof geometry.pathData !== "string" ||
        (typeof geometry.name !== "string" && geometry.name != null)
      ) {
        throw new Error("Invalid path geometry");
      }
      if (!geometry.viewBox || typeof geometry.viewBox !== "object") {
        throw new Error("Invalid path viewBox");
      }
      return {
        type: "path",
        name: geometry.name ?? "",
        pathData: validateSvgPathData(geometry.pathData),
        viewBox: {
          width: atLeast(geometry.viewBox.width, Number.EPSILON, "viewBox.width"),
          height: atLeast(geometry.viewBox.height, Number.EPSILON, "viewBox.height"),
        },
      };
    }
    default:
      throw new Error("Unsupported shape geometry");
  }
}
