/**
 * Gamma filter for Konva.
 * Applies a power-curve gamma correction to all RGB channels.
 * Range: -1 to 1, default 0 (no change).
 * Positive values brighten midtones, negative values darken midtones.
 */
export function Gamma(this: any, imageData: ImageData): void {
  const gamma = this.getAttr("gamma") ?? 0;
  if (gamma === 0) return;

  // Map -1..1 to a gamma correction factor:
  // gamma > 0 → factor < 1 → brightens midtones
  // gamma < 0 → factor > 1 → darkens midtones
  const correction = 1 / (1 + gamma);
  const pixels = imageData.data;
  const len = pixels.length;

  for (let i = 0; i < len; i += 4) {
    pixels[i] = Math.min(255, Math.max(0, 255 * (pixels[i] / 255) ** correction));
    pixels[i + 1] = Math.min(255, Math.max(0, 255 * (pixels[i + 1] / 255) ** correction));
    pixels[i + 2] = Math.min(255, Math.max(0, 255 * (pixels[i + 2] / 255) ** correction));
  }
}
