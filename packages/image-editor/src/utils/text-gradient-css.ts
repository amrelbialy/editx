import type { TextGradient } from "@editx/engine";

/**
 * Serialize a text `fillGradient` to a CSS gradient string. Used for the
 * properties-bar color swatch and preset thumbnails so both reflect the real
 * gradient fill instead of falling back to the solid `fill`.
 */
export function textGradientToCss(gradient: TextGradient): string {
  const stops = gradient.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
  if (gradient.type === "radial") return `radial-gradient(${stops})`;
  return `linear-gradient(${gradient.angle ?? 0}deg, ${stops})`;
}
