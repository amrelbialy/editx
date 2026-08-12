import type { Color } from "../block/block.types";
import {
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_WIDTH,
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_GEOMETRY,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import type {
  TextBackgroundBoxStyle,
  TextBoxShadow,
  TextBoxStroke,
} from "./formatted-text-box-render";

/**
 * What the property store returns for an unset colour key, and therefore what
 * `getTextBackground` / `getShadowColor` report.
 */
const UNSET_COLOR: Color = { r: 0, g: 0, b: 0, a: 1 };

function asColor(value: unknown): Color | undefined {
  return value && typeof value === "object" ? (value as Color) : undefined;
}

/**
 * Every fallback here is the PROPERTY STORE's fallback, never a prettier
 * invented one: the renderer must paint exactly what the public API reports,
 * or the panels read one value while the canvas shows another.
 *
 * In particular the box colour does NOT fall back to the `fillId` sub-block —
 * `getTextBackground` reads only `text/background/color`, so borrowing the
 * legacy full-frame fill colour here would make the swatch disagree with the
 * canvas and the first colour edit silently rewrite it.
 */
function resolveBoxColor(props: Record<string, unknown>): string {
  return colorToHex(asColor(props[TEXT_BACKGROUND_COLOR]) ?? UNSET_COLOR);
}

/**
 * On a TEXT block the generic `shadow/*` and `stroke/*` keys describe the
 * background box, and are inert unless `text/background/enabled` is true —
 * hence they're only read from inside this resolver.
 */
function resolveBoxShadow(props: Record<string, unknown>): TextBoxShadow | null {
  if (!((props[SHADOW_ENABLED] as boolean) ?? false)) return null;
  return {
    color: colorToHex(asColor(props[SHADOW_COLOR]) ?? UNSET_COLOR),
    blur: (props[SHADOW_BLUR] as number) ?? 0,
    offsetX: (props[SHADOW_OFFSET_X] as number) ?? 0,
    offsetY: (props[SHADOW_OFFSET_Y] as number) ?? 0,
  };
}

function resolveBoxStroke(props: Record<string, unknown>): TextBoxStroke | null {
  if (!((props[STROKE_ENABLED] as boolean) ?? false)) return null;
  const color = asColor(props[STROKE_COLOR]);
  const width = (props[STROKE_WIDTH] as number) ?? 0;
  if (!color || width <= 0) return null;
  return { color: colorToHex(color), width };
}

/** Resolve every background-box property into one paint style, or null when off. */
export function resolveTextBackgroundBox(
  props: Record<string, unknown>,
): TextBackgroundBoxStyle | null {
  if (!((props[TEXT_BACKGROUND_ENABLED] as boolean) ?? false)) return null;

  const geometry = props[TEXT_BACKGROUND_GEOMETRY] === "frame" ? "frame" : "text-union";
  const paddingValue = (key: string): number => {
    const value = (props[key] as number) ?? 0;
    return geometry === "frame" ? Math.max(0, value) : value;
  };

  return {
    color: resolveBoxColor(props),
    geometry,
    cornerRadius: (props[TEXT_BACKGROUND_CORNER_RADIUS] as number) ?? 0,
    padding: {
      top: paddingValue(TEXT_BACKGROUND_PADDING_TOP),
      right: paddingValue(TEXT_BACKGROUND_PADDING_RIGHT),
      bottom: paddingValue(TEXT_BACKGROUND_PADDING_BOTTOM),
      left: paddingValue(TEXT_BACKGROUND_PADDING_LEFT),
    },
    shadow: resolveBoxShadow(props),
    stroke: resolveBoxStroke(props),
  };
}
