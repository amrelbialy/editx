/**
 * Clarity filter for Konva.
 * Enhances local contrast (midtone contrast) using an unsharp-mask approach
 * with a large effective radius. Similar to Lightroom's Clarity slider.
 * Range: -1 to 1, default 0 (no change).
 */
export function Clarity(this: any, imageData: ImageData): void {
  const clarity = this.getAttr("clarity") ?? 0;
  if (clarity === 0) return;

  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  const strength = clarity * 0.5;

  // Simple box-blur approximation (radius 2) for local contrast
  const r = 2;
  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        // 5×5 neighbourhood average
        let sum = 0;
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            sum += src[((y + dy) * width + (x + dx)) * 4 + c];
            count++;
          }
        }
        const avg = sum / count;
        const center = src[idx + c];
        // Unsharp mask: enhance difference between pixel and local average
        data[idx + c] = Math.min(255, Math.max(0, center + strength * (center - avg)));
      }
    }
  }
}
