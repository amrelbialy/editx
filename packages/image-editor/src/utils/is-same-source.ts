import type { ImageSource } from '../image-editor';

/**
 * Compare two image sources for identity.
 *
 * - `string`:             strict equality
 * - `File`:               same object reference (File objects are immutable handles)
 * - `Blob`:               same object reference
 * - `HTMLImageElement`:   same object reference
 * - `HTMLCanvasElement`:  same object reference
 * - mixed types:          never equal
 */
export function isSameSource(a: ImageSource | null | undefined, b: ImageSource | null | undefined): boolean {
  if (a == null || b == null) return false;
  if (a === b) return true; // covers same string or same object ref

  // Both strings — already covered by ===
  return false;
}
