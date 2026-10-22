import type { Color, GradientStop, TextRun } from "./block/block.types";
import {
  hasOwn,
  isFiniteNumber,
  isRecord,
  isString,
  type ValidationContext,
} from "./document-validation-context";

export function validateColor(value: unknown, context: ValidationContext): value is Color {
  if (!isRecord(value)) return context.fail("INVALID_FIELD", "Color must be an RGBA object");
  let valid = true;
  for (const channel of ["r", "g", "b", "a"]) {
    if (!context.field(value, channel, isFiniteNumber, "Color channels must be finite numbers")) {
      valid = false;
    }
  }
  return valid;
}

export function validateStops(value: unknown, context: ValidationContext): value is GradientStop[] {
  if (!Array.isArray(value))
    return context.fail("INVALID_FIELD", "Gradient stops must be an array");
  let valid = true;
  value.forEach((stop, index) => {
    const item = context.at(index);
    if (!isRecord(stop)) {
      item.fail("INVALID_FIELD", "Gradient stop must be an object");
      valid = false;
      return;
    }
    if (!item.field(stop, "offset", isFiniteNumber, "Gradient offset must be finite"))
      valid = false;
    if (!item.field(stop, "color", isString, "Gradient color must be a string")) valid = false;
  });
  return valid;
}

function validateGradient(value: unknown, context: ValidationContext, stroke: boolean): boolean {
  if (!isRecord(value)) return context.fail("INVALID_FIELD", "Text gradient must be an object");
  const typeValid = context.field(
    value,
    "type",
    (type): type is string => type === "linear" || (!stroke && type === "radial"),
    "Invalid text gradient type",
  );
  const stopsValid = hasOwn(value, "stops")
    ? validateStops(value.stops, context.at("stops"))
    : context.at("stops").fail("MISSING_FIELD", "Gradient stops are required");
  let valid = stopsValid && typeValid;
  if (stroke || hasOwn(value, "angle")) {
    if (!context.field(value, "angle", isFiniteNumber, "Gradient angle must be finite"))
      valid = false;
  }
  return valid;
}

const numericStyles = new Set([
  "fontSize",
  "letterSpacing",
  "backgroundOpacity",
  "backgroundCornerRadius",
  "textShadowBlur",
  "textShadowOffsetX",
  "textShadowOffsetY",
  "textStrokeWidth",
]);
const stringStyles = new Set([
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "fill",
  "textDecoration",
  "backgroundColor",
  "textShadowColor",
  "textStrokeColor",
]);

function validateStyle(value: unknown, context: ValidationContext): boolean {
  if (!isRecord(value)) return context.fail("INVALID_FIELD", "Text run style must be an object");
  let valid = true;
  for (const [key, item] of Object.entries(value)) {
    const field = context.at(key);
    if (numericStyles.has(key) && !isFiniteNumber(item)) {
      field.fail("INVALID_FIELD", "Text style number must be finite");
      valid = false;
    } else if (stringStyles.has(key) && !isString(item)) {
      field.fail("INVALID_FIELD", "Text style value must be a string");
      valid = false;
    } else if (key === "fillGradient" || key === "textStrokeGradient") {
      if (!validateGradient(item, field, key === "textStrokeGradient")) valid = false;
    } else if (key === "backgroundPadding") {
      if (!isRecord(item)) {
        field.fail("INVALID_FIELD", "Text padding must be an object");
        valid = false;
      } else {
        for (const side of ["top", "right", "bottom", "left"]) {
          if (hasOwn(item, side) && !isFiniteNumber(item[side])) {
            field.at(side).fail("INVALID_FIELD", "Text padding must be finite");
            valid = false;
          }
        }
      }
    } else if (
      key === "textTransform" &&
      !(isString(item) && ["none", "uppercase", "lowercase", "capitalize"].includes(item))
    ) {
      field.fail("INVALID_FIELD", "Invalid text transform");
      valid = false;
    }
  }
  return valid;
}

export function validateRuns(value: unknown, context: ValidationContext): value is TextRun[] {
  if (!Array.isArray(value)) return context.fail("INVALID_FIELD", "Text runs must be an array");
  let valid = true;
  value.forEach((run, index) => {
    const item = context.at(index);
    if (!isRecord(run)) {
      item.fail("INVALID_FIELD", "Text run must be an object");
      valid = false;
      return;
    }
    if (!item.field(run, "text", isString, "Text run text must be a string")) valid = false;
    if (!hasOwn(run, "style")) {
      item.at("style").fail("MISSING_FIELD", "Text run style is required");
      valid = false;
    } else if (!validateStyle(run.style, item.at("style"))) valid = false;
  });
  return valid;
}
