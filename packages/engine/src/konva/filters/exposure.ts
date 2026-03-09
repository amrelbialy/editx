/**
 * Exposure filter for Konva.
 * Applies a gamma-based exposure adjustment.
 * Range: -1 to 1, default 0 (no change).
 * Positive values brighten (like opening the aperture), negative values darken.
 */
export function Exposure(this: any, imageData: ImageData): void {
  const exposure = this.getAttr('exposure') ?? 0;
  if (exposure === 0) return;

  // exposure → multiplier: 2^exposure gives photographic stops
  const multiplier = Math.pow(2, exposure);
  const pixels = imageData.data;
  const len = pixels.length;

  for (let i = 0; i < len; i += 4) {
    pixels[i] = Math.min(255, Math.max(0, pixels[i] * multiplier));
    pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] * multiplier));
    pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] * multiplier));
  }
}
