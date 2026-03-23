/**
 * Blacks filter for Konva.
 * Adjusts the black point of the image — lifts or crushes shadow details.
 * Range: -1 to 1, default 0 (no change).
 * Positive values lift blacks (reduce contrast in shadows).
 * Negative values crush blacks (deepen shadows).
 */
export function Blacks(this: any, imageData: ImageData): void {
  const blacks = this.getAttr("blacks") ?? 0;
  if (blacks === 0) return;

  const pixels = imageData.data;
  const len = pixels.length;
  // Shift applied to the darkest tones, fading out toward midtones
  const shift = blacks * 64;

  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = pixels[i + c];
      // Weight: strongest at 0, fades to 0 at ~128
      const weight = Math.max(0, 1 - v / 128);
      pixels[i + c] = Math.min(255, Math.max(0, v + shift * weight));
    }
  }
}
