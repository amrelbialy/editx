/**
 * Highlights & Shadows filter for Konva.
 * Adjusts brightness selectively based on pixel luminance.
 * - Highlights affects bright pixels (luminance > 0.5)
 * - Shadows affects dark pixels (luminance ≤ 0.5)
 *
 * Range: -1 to 1, default 0 (no change).
 */
export function HighlightsShadows(this: any, imageData: ImageData): void {
  const highlights = this.getAttr("highlights") ?? 0;
  const shadows = this.getAttr("shadows") ?? 0;
  if (highlights === 0 && shadows === 0) return;

  const pixels = imageData.data;
  const len = pixels.length;

  // Scale factors — multiply by 255 for pixel-space adjustment
  const hAdj = highlights * 128;
  const sAdj = shadows * 128;

  for (let i = 0; i < len; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Perceived luminance (0–255)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Blend factor: 0 at one extreme, 1 at the other
    const highlightWeight = Math.max(0, (lum / 255 - 0.5) * 2); // 0 for dark, 1 for bright
    const shadowWeight = Math.max(0, (0.5 - lum / 255) * 2); // 1 for dark, 0 for bright

    const adjustment = hAdj * highlightWeight + sAdj * shadowWeight;

    pixels[i] = Math.min(255, Math.max(0, r + adjustment));
    pixels[i + 1] = Math.min(255, Math.max(0, g + adjustment));
    pixels[i + 2] = Math.min(255, Math.max(0, b + adjustment));
  }
}
