import type { BlockType, PropertyValue } from "./block/block.types";
import {
  getBlockDefaults,
  getEffectDefaults,
  getFillDefaults,
  getShapeDefaults,
} from "./block/block-defaults";
import * as P from "./block/property-keys";
import { validateColor, validateRuns, validateStops } from "./document-text-validation";
import { isFiniteNumber, isRecord, type ValidationContext } from "./document-validation-context";

export const BLOCK_TYPES: readonly BlockType[] = [
  "scene",
  "page",
  "graphic",
  "text",
  "image",
  "group",
  "effect",
  "shape",
  "fill",
];

const samples = new Map<string, PropertyValue>(
  [
    ...BLOCK_TYPES.map(getBlockDefaults),
    ...["adjustments", "filter"].map(getEffectDefaults),
    ...["color", "gradient", "image"].map(getFillDefaults),
    ...["rect", "ellipse", "polygon", "star", "line", "path"].map(getShapeDefaults),
    {
      [P.FONT_SIZE]: 24,
      [P.FONT_FAMILY]: "Arial",
      [P.TEXT_CONTENT]: "",
      [P.STROKE_GRADIENT_ENABLED]: false,
      [P.STROKE_GRADIENT_ANGLE]: 0,
      [P.STROKE_GRADIENT_STOPS]: [],
      [P.TEXT_BACKGROUND_ENABLED]: false,
      [P.TEXT_BACKGROUND_COLOR]: { r: 0, g: 0, b: 0, a: 1 },
      [P.TEXT_BACKGROUND_GEOMETRY]: "text-union",
      [P.TEXT_BACKGROUND_CORNER_RADIUS]: 0,
      [P.TEXT_BACKGROUND_PADDING_TOP]: 0,
      [P.TEXT_BACKGROUND_PADDING_RIGHT]: 0,
      [P.TEXT_BACKGROUND_PADDING_BOTTOM]: 0,
      [P.TEXT_BACKGROUND_PADDING_LEFT]: 0,
      [P.FILL_IMAGE_ALIGNMENT]: "center",
      [P.PAGE_METADATA]: {},
    },
  ].flatMap((properties) => Object.entries(properties)),
);

function isStringMap(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function validateProperty(
  key: string,
  value: unknown,
  context: ValidationContext,
): value is PropertyValue {
  const sample = samples.get(key);
  if (sample !== undefined) {
    if (typeof sample === "number")
      return isFiniteNumber(value) || context.fail("INVALID_FIELD", "Property must be finite");
    if (typeof sample === "string" || typeof sample === "boolean")
      return (
        typeof value === typeof sample ||
        context.fail("INVALID_FIELD", `Property must be a ${typeof sample}`)
      );
    if (key === P.TEXT_RUNS) return validateRuns(value, context);
    if (Array.isArray(sample)) return validateStops(value, context);
    if (key !== P.PAGE_METADATA) return validateColor(value, context);
    return (
      isStringMap(value) || context.fail("INVALID_FIELD", "Page metadata must be a string map")
    );
  }
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    isFiniteNumber(value) ||
    isStringMap(value)
  )
    return true;
  if (Array.isArray(value)) {
    return isRecord(value[0]) && "offset" in value[0]
      ? validateStops(value, context)
      : validateRuns(value, context);
  }
  if (isRecord(value) && "r" in value) return validateColor(value, context);
  return context.fail("INVALID_FIELD", "Unsupported block property value");
}

export function validateProperties(
  value: unknown,
  context: ValidationContext,
): value is Record<string, PropertyValue> {
  if (!isRecord(value)) return context.fail("INVALID_FIELD", "Block properties must be an object");
  let valid = true;
  for (const [key, item] of Object.entries(value)) {
    if (!validateProperty(key, item, context.at(key))) valid = false;
  }
  return valid;
}
