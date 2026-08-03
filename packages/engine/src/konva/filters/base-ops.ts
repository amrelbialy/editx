/**
 * Canonical normalized filter primitives.
 *
 * Every operation works on a Float32 RGBA working buffer where R/G/B are in
 * conceptual 0..1 range (alpha untouched). NO operation clamps — clamping
 * happens exactly once at the very end of the chain (see `cpu-chain.ts`).
 *
 * These formulas are the single source of truth shared with the WebGL shader
 * (`glsl-filter-shaders.ts`). Keep them in lock-step.
 */

// ── adjustment ops ──

export function opBrightness(buf: Float32Array, v: number): void {
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] += v;
    buf[i + 1] += v;
    buf[i + 2] += v;
  }
}

/** Canonical contrast: factor = (1+v)^2; out = (c-0.5)*factor + 0.5. */
export function opContrast(buf: Float32Array, v: number): void {
  const f = (1 + v) * (1 + v);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = (buf[i] - 0.5) * f + 0.5;
    buf[i + 1] = (buf[i + 1] - 0.5) * f + 0.5;
    buf[i + 2] = (buf[i + 2] - 0.5) * f + 0.5;
  }
}

/** Canonical saturation: luma mix; out = luma*(-v) + c*(1+v). */
export function opSaturation(buf: Float32Array, v: number): void {
  const m = 1 + v;
  for (let i = 0; i < buf.length; i += 4) {
    const luma = 0.2989 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
    buf[i] = -luma * v + buf[i] * m;
    buf[i + 1] = -luma * v + buf[i + 1] * m;
    buf[i + 2] = -luma * v + buf[i + 2] * m;
  }
}

export function opGamma(buf: Float32Array, v: number): void {
  const correction = 1 / (1 + v);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = Math.max(0, buf[i]) ** correction;
    buf[i + 1] = Math.max(0, buf[i + 1]) ** correction;
    buf[i + 2] = Math.max(0, buf[i + 2]) ** correction;
  }
}

export function opExposure(buf: Float32Array, v: number): void {
  const m = 2 ** v;
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] *= m;
    buf[i + 1] *= m;
    buf[i + 2] *= m;
  }
}

export function opTemperature(buf: Float32Array, v: number): void {
  const shift = (v * 40) / 255;
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] += shift;
    buf[i + 2] -= shift;
  }
}

export function opHighlightsShadows(buf: Float32Array, highlights: number, shadows: number): void {
  const h = (highlights * 128) / 255;
  const s = (shadows * 128) / 255;
  for (let i = 0; i < buf.length; i += 4) {
    const lum = 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
    const hWeight = Math.max(0, (lum - 0.5) * 2);
    const sWeight = Math.max(0, (0.5 - lum) * 2);
    const adj = h * hWeight + s * sWeight;
    buf[i] += adj;
    buf[i + 1] += adj;
    buf[i + 2] += adj;
  }
}

export function opBlacks(buf: Float32Array, v: number): void {
  const shift = (v * 64) / 255;
  const pivot = 128 / 255;
  for (let i = 0; i < buf.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const value = buf[i + ch];
      const weight = Math.max(0, 1 - value / pivot);
      buf[i + ch] = value + shift * weight;
    }
  }
}

export function opWhites(buf: Float32Array, v: number): void {
  const shift = (v * 64) / 255;
  const lo = 128 / 255;
  const range = 127 / 255;
  for (let i = 0; i < buf.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const value = buf[i + ch];
      const weight = Math.max(0, (value - lo) / range);
      buf[i + ch] = value + shift * weight;
    }
  }
}

// ── spatial ops (read a snapshot, skip borders — matches historical CPU) ──

export function opClarity(buf: Float32Array, width: number, height: number, v: number): void {
  const src = buf.slice();
  const strength = v * 0.5;
  const r = 2;
  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const idx = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            sum += src[((y + dy) * width + (x + dx)) * 4 + ch];
          }
        }
        const avg = sum / 25;
        const center = src[idx + ch];
        buf[idx + ch] = center + strength * (center - avg);
      }
    }
  }
}

/**
 * Sharpness unsharp mask.
 *
 * `center` values are read from `buf` (which may already have clarity applied),
 * while neighbour averages are read from `src` — the ORIGINAL, pre-clarity
 * source. This matches the single-pass WebGL shader, which can only sample the
 * original texture for neighbours.
 */
export function opSharpness(
  buf: Float32Array,
  src: Float32Array,
  width: number,
  height: number,
  amount: number,
): void {
  const strength = amount / 100;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const center = buf[idx + ch];
        const avg =
          (src[idx - width * 4 + ch] +
            src[idx + width * 4 + ch] +
            src[idx - 4 + ch] +
            src[idx + 4 + ch]) /
          4;
        buf[idx + ch] = center + strength * (center - avg);
      }
    }
  }
}

// ── preset ops ──

export function opSepia(buf: Float32Array, amount: number): void {
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i];
    const g = buf[i + 1];
    const bl = buf[i + 2];
    buf[i] = r * (1 - 0.607 * amount) + g * 0.769 * amount + bl * 0.189 * amount;
    buf[i + 1] = r * 0.349 * amount + g * (1 - 0.314 * amount) + bl * 0.168 * amount;
    buf[i + 2] = r * 0.272 * amount + g * 0.534 * amount + bl * (1 - 0.869 * amount);
  }
}

export function opGrayscale(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i += 4) {
    const avg = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
    buf[i] = avg;
    buf[i + 1] = avg;
    buf[i + 2] = avg;
  }
}

export function opInvert(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 1 - buf[i];
    buf[i + 1] = 1 - buf[i + 1];
    buf[i + 2] = 1 - buf[i + 2];
  }
}

export function opSolarize(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const value = buf[i + ch];
      // Use >= to match the GLSL step(0.5, color), which inverts at exactly 0.5.
      buf[i + ch] = value >= 0.5 ? 1 - value : value;
    }
  }
}

/** threshold in normalized 0..1. */
export function opBlackWhite(buf: Float32Array, threshold: number): void {
  for (let i = 0; i < buf.length; i += 4) {
    const avg = (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
    const value = avg > threshold ? 1 : 0;
    buf[i] = value;
    buf[i + 1] = value;
    buf[i + 2] = value;
  }
}

export function opRgbMul(buf: Float32Array, rgb: readonly [number, number, number]): void {
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] *= rgb[0];
    buf[i + 1] *= rgb[1];
    buf[i + 2] *= rgb[2];
  }
}

/** rgba in normalized 0..1 (a is blend amount). */
export function opColorFilter(
  buf: Float32Array,
  rgba: readonly [number, number, number, number],
): void {
  const [cr, cg, cb, ca] = rgba;
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] -= (buf[i] - cr) * ca;
    buf[i + 1] -= (buf[i + 1] - cg) * ca;
    buf[i + 2] -= (buf[i + 2] - cb) * ca;
  }
}
