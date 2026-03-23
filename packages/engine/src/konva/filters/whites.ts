/**
 * Whites filter for Konva.
 * Adjusts the white point of the image — boosts or dims highlight details.
 * Range: -1 to 1, default 0 (no change).
 * Positive values push highlights brighter.
 * Negative values pull highlights down.
 */
export function Whites(this: any, imageData: ImageData): void {
  const whites = this.getAttr("whites") ?? 0;
  if (whites === 0) return;

  const pixels = imageData.data;
  const len = pixels.length;
  // Shift applied to the brightest tones, fading toward midtones
  const shift = whites * 64;

  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = pixels[i + c];
      // Weight: strongest at 255, fades to 0 at ~128
      const weight = Math.max(0, (v - 128) / 127);
      pixels[i + c] = Math.min(255, Math.max(0, v + shift * weight));
    }
  }
}
