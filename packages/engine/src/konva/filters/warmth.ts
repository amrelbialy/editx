/**
 * Temperature filter for Konva.
 * Adds warmth (positive) or coolness (negative) by adjusting R and B channels.
 * Range: -1 to 1, default 0 (no change).
 */
export function Temperature(this: any, imageData: ImageData): void {
  const temp = this.getAttr("temperature") ?? 0;
  if (temp === 0) return;

  const shift = temp * 40; // Scale to visible range
  const pixels = imageData.data;
  const len = pixels.length;
  for (let i = 0; i < len; i += 4) {
    pixels[i] = Math.min(255, Math.max(0, pixels[i] + shift)); // R
    pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] - shift)); // B
  }
}
