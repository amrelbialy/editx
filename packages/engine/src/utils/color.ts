import type { Color } from '../block/block.types';

/**
 * Convert a Color (0–1 range per channel) to a CSS hex string.
 * Returns an `rgba()` string when alpha < 1.
 */
export function colorToHex(c: Color): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  if (c.a < 1) {
    return `rgba(${r},${g},${b},${c.a})`;
  }
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse a "#rrggbb" hex string into a Color with alpha = 1.
 */
export function hexToColor(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b, a: 1 };
}
