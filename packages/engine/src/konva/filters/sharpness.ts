/**
 * Sharpness filter for Konva.
 * Applies a 3×3 unsharp-mask convolution.
 * Range: 0–100, default 0 (no sharpening).
 */
export function Sharpness(this: any, imageData: ImageData): void {
  const amount = this.getAttr('sharpness') ?? 0;
  if (amount === 0) return;

  const strength = amount / 100;
  const { data, width, height } = imageData;

  // Copy original pixels for read-only source
  const src = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        // Average of 4-connected neighbours
        const avg =
          (src[idx - width * 4 + c] +
            src[idx + width * 4 + c] +
            src[idx - 4 + c] +
            src[idx + 4 + c]) /
          4;
        // Unsharp mask: center + strength * (center - avg)
        data[idx + c] = Math.min(255, Math.max(0, center + strength * (center - avg)));
      }
    }
  }
}
