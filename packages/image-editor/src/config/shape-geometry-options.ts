import type { ShapeGeometry } from "@editx/engine";
import type { ShapePreset } from "./preset.types";

const SVG_PATH_DATA_PATTERN = /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-+eE]*$/;

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

export function toShapeGeometry(shape: ShapePreset["shape"], presetId?: string): ShapeGeometry {
  switch (shape.kind) {
    case "rect":
      return { type: "rect", cornerRadius: shape.cornerRadius };
    case "ellipse":
      return { type: "ellipse" };
    case "polygon":
      return { type: "polygon", sides: shape.sides };
    case "star":
      return { type: "star", points: shape.points, innerDiameter: shape.innerDiameter };
    case "line":
      return {
        type: "line",
        pointerLength: shape.pointerLength,
        pointerWidth: shape.pointerWidth,
      };
    case "path":
      if (shape.pathData === undefined || shape.viewBox === undefined) {
        throw new Error("Path presets require pathData and viewBox");
      }
      return {
        type: "path",
        name: shape.name ?? presetId,
        pathData: shape.pathData,
        viewBox: shape.viewBox,
      };
  }
}

function normalizeShapeGeometry(geometry: ShapeGeometry): ShapeGeometry {
  switch (geometry.type) {
    case "rect":
      return { type: "rect", cornerRadius: atLeast(geometry.cornerRadius ?? 0, 0, "cornerRadius") };
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
        !SVG_PATH_DATA_PATTERN.test(geometry.pathData) ||
        (typeof geometry.name !== "string" && geometry.name != null)
      ) {
        throw new Error("Invalid SVG path data");
      }
      if (!geometry.viewBox || typeof geometry.viewBox !== "object") {
        throw new Error("Invalid path viewBox");
      }
      return {
        type: "path",
        name: geometry.name ?? "",
        pathData: geometry.pathData,
        viewBox: {
          width: atLeast(geometry.viewBox.width, Number.EPSILON, "viewBox.width"),
          height: atLeast(geometry.viewBox.height, Number.EPSILON, "viewBox.height"),
        },
      };
    }
  }
}

export function normalizeShapePresetGeometry(
  shape: ShapePreset["shape"],
  presetId?: string,
): ShapeGeometry {
  return normalizeShapeGeometry(toShapeGeometry(shape, presetId));
}
