import type { TextRunStyle, TextRunStyleUpdate } from "@editx/engine";
import type {
  TextBoxPadding,
  TextPresetRunStyle,
  TextPresetRunStyleUpdate,
  TextRunOverride,
} from "../config/config.types";

export interface ConvertedTextRunOverride {
  start: number;
  end: number;
  style: TextRunStyleUpdate;
}

const SCALED_FIELDS = [
  "letterSpacing",
  "textStrokeWidth",
  "textShadowBlur",
  "textShadowOffsetX",
  "textShadowOffsetY",
  "backgroundCornerRadius",
] as const;

function resolvePadding(padding: TextBoxPadding, scale: number) {
  const value =
    typeof padding === "number"
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : padding;
  return {
    top: (value.top ?? 0) * scale,
    right: (value.right ?? 0) * scale,
    bottom: (value.bottom ?? 0) * scale,
    left: (value.left ?? 0) * scale,
  };
}

function setFill(
  result: TextRunStyleUpdate,
  source: TextPresetRunStyle | TextPresetRunStyleUpdate,
) {
  const hasFill = Object.getOwnPropertyDescriptor(source, "fill") && source.fill !== undefined;
  const hasGradient =
    Object.getOwnPropertyDescriptor(source, "fillGradient") && source.fillGradient !== undefined;
  if (hasFill) {
    result.fill = source.fill;
    if (!hasGradient) result.fillGradient = null;
  }
  if (hasGradient) result.fillGradient = source.fillGradient;
}

export function convertTextPresetRunStyle(
  source: TextPresetRunStyle | TextPresetRunStyleUpdate,
  baseFontSize: number,
  canvasScale: number,
): TextRunStyleUpdate {
  const result: TextRunStyleUpdate = {};
  const nullable = source as TextPresetRunStyleUpdate;

  if (nullable.fontSizeScale !== undefined) {
    result.fontSize =
      nullable.fontSizeScale === null
        ? null
        : Math.round(baseFontSize * nullable.fontSizeScale * canvasScale);
  }
  if (nullable.fontFamily !== undefined) result.fontFamily = nullable.fontFamily;
  if (nullable.fontWeight !== undefined) result.fontWeight = nullable.fontWeight;
  if (nullable.fontStyle !== undefined) result.fontStyle = nullable.fontStyle;
  if (nullable.textDecoration !== undefined) result.textDecoration = nullable.textDecoration;
  if (nullable.textStrokeColor !== undefined) result.textStrokeColor = nullable.textStrokeColor;
  if (nullable.textShadowColor !== undefined) result.textShadowColor = nullable.textShadowColor;
  if (nullable.backgroundColor !== undefined) result.backgroundColor = nullable.backgroundColor;
  if (nullable.backgroundOpacity !== undefined)
    result.backgroundOpacity = nullable.backgroundOpacity;
  for (const field of SCALED_FIELDS) {
    const value = nullable[field];
    if (value !== undefined) result[field] = value === null ? null : value * canvasScale;
  }
  const transform = nullable.transform !== undefined ? nullable.transform : nullable.textTransform;
  if (transform !== undefined) result.textTransform = transform;
  if (nullable.backgroundPadding !== undefined) {
    result.backgroundPadding =
      nullable.backgroundPadding === null
        ? null
        : resolvePadding(nullable.backgroundPadding, canvasScale);
  }
  setFill(result, source);
  return result;
}

function bisectsSurrogatePair(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  const previous = text.charCodeAt(index - 1);
  const next = text.charCodeAt(index);
  return previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}

export function convertValidTextRunOverrides(
  text: string,
  overrides: TextRunOverride[] | undefined,
  baseFontSize: number,
  canvasScale: number,
): ConvertedTextRunOverride[] {
  return (overrides ?? []).flatMap((override) => {
    const valid =
      Number.isSafeInteger(override.start) &&
      Number.isSafeInteger(override.end) &&
      override.start >= 0 &&
      override.start < override.end &&
      override.end <= text.length &&
      !bisectsSurrogatePair(text, override.start) &&
      !bisectsSurrogatePair(text, override.end);
    return valid
      ? [
          {
            ...override,
            style: convertTextPresetRunStyle(override.style, baseFontSize, canvasScale),
          },
        ]
      : [];
  });
}

export function toInitialTextRunStyle(style: TextRunStyleUpdate): Partial<TextRunStyle> {
  return Object.fromEntries(Object.entries(style).filter((entry) => entry[1] !== null));
}
