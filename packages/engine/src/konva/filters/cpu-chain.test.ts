/**
 * @vitest-environment node
 *
 * Ordering + clamping semantics of the single CPU filter runner. These tests
 * construct order-sensitive inputs so a wrong op order or a per-op clamp would
 * produce a different (asserted-against) result.
 */
import { describe, expect, it } from "vitest";
import { opBrightness, opContrast } from "./base-ops";
import type { AdjustmentValues } from "./build-filter-pipeline";
import { applyFilterChain } from "./cpu-chain";
import type { PresetOp } from "./presets/preset-defs";

const ZERO: AdjustmentValues = {
  brightness: 0,
  saturation: 0,
  contrast: 0,
  gamma: 0,
  clarity: 0,
  exposure: 0,
  shadows: 0,
  highlights: 0,
  blacks: 0,
  whites: 0,
  temperature: 0,
  sharpness: 0,
};

/** Build an ImageData-like object (happy-dom not needed — plain shape). */
function makeImageData(pixels: number[], width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(pixels);
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

/** Single-pixel image with the given 0..255 RGB (alpha 255). */
function onePixel(r: number, g: number, b: number): ImageData {
  return makeImageData([r, g, b, 255], 1, 1);
}

describe("applyFilterChain ordering + clamp", () => {
  it("applies brightness before contrast (order matters)", () => {
    // Start at mid-gray. brightness +0.2 then contrast about 0.5.
    const img = onePixel(128, 128, 128);
    applyFilterChain(img, { ...ZERO, brightness: 0.2, contrast: 1 }, []);

    // Reference: same ops in the canonical order on a float buffer.
    const buf = Float32Array.from([128 / 255, 128 / 255, 128 / 255, 1]);
    opBrightness(buf, 0.2);
    opContrast(buf, 1);
    // Assert numerically equal to float pipeline (clamped to 0..255).
    expect(img.data[0]).toBe(clamp255(buf[0] * 255));
  });

  it("runs preset ops AFTER all adjustments", () => {
    // adjustment: brightness +0.1; preset: invert. Order => invert(bright(x)).
    const img = onePixel(100, 100, 100);
    const preset: PresetOp[] = [{ op: "invert" }];
    applyFilterChain(img, { ...ZERO, brightness: 0.1 }, preset);

    const buf = Float32Array.from([100 / 255, 100 / 255, 100 / 255, 1]);
    opBrightness(buf, 0.1);
    buf[0] = 1 - buf[0];
    expect(img.data[0]).toBe(clamp255(buf[0] * 255));
  });

  it("folds preset ops in array order (contrast then colorFilter differs from reverse)", () => {
    const forward: PresetOp[] = [
      { op: "contrast", value: 0.2 },
      { op: "colorFilter", value: [200, 100, 50, 0.5] },
    ];
    const reverse: PresetOp[] = [forward[1], forward[0]];
    // Mid-gray keeps every intermediate in 0..1 so clamping can't mask the
    // order difference.
    const a = onePixel(120, 120, 120);
    const b = onePixel(120, 120, 120);
    applyFilterChain(a, null, forward);
    applyFilterChain(b, null, reverse);
    // Non-commutative ops => the two orders must produce different pixels.
    expect([...a.data]).not.toEqual([...b.data]);
  });

  it("clamps exactly once at the end (overshoot then undershoot survives)", () => {
    // exposure pushes >1 (overshoot), then a preset brightness of -0.5 pulls it
    // back into range. A naive per-op clamp would clip the overshoot to 1.0
    // first, giving a *higher* final value than the single-trailing-clamp path.
    const img = onePixel(200, 200, 200); // ~0.784
    applyFilterChain(img, { ...ZERO, exposure: 1 }, [{ op: "brightness", value: -0.5 }]);

    // Single-clamp reference: (0.784 * 2) - 0.5 = 1.0686 -> then clamp.
    const v = (200 / 255) * 2 - 0.5;
    expect(img.data[0]).toBe(clamp255(v * 255));

    // Per-op-clamp reference would be: min(1.568,1) - 0.5 = 0.5 -> 127/128.
    const perOp = clamp255((Math.min(1, (200 / 255) * 2) - 0.5) * 255);
    expect(img.data[0]).not.toBe(perOp);
  });

  it("sharpness samples neighbours from the PRE-clarity buffer", () => {
    // 7x7 image so clarity (radius 2) actually modifies the neighbours of the
    // sharpness center at (3,3). If sharpness sampled the POST-clarity
    // neighbours it would use different data. The fix samples the ORIGINAL
    // neighbours, so we can predict the exact result and prove the distinction.
    const w = 7;
    const h = 7;
    const px: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Deterministic high-local-contrast field kept mid-range (64..191) so
        // clarity meaningfully alters neighbours and nothing clamps.
        const v = ((x * 37 + y * 53) % 128) + 64;
        px.push(v, v, v, 255);
      }
    }
    const img = makeImageData(px, w, h);
    applyFilterChain(img, { ...ZERO, clarity: 0.5, sharpness: 50 }, []);

    // Reference implementation mirroring cpu-chain: clarity first, then
    // sharpness reading neighbours from the ORIGINAL (pre-clarity) buffer.
    const buf = new Float32Array(px.length);
    for (let i = 0; i < px.length; i++) buf[i] = px[i] / 255;
    const original = buf.slice();
    applyClarityRef(buf, w, h, 0.5);
    applySharpnessRef(buf, original, w, h, 50);
    const idx = (3 * w + 3) * 4;
    expect(img.data[idx]).toBe(clamp255(buf[idx] * 255));

    // Sanity: a WRONG impl that samples post-clarity neighbours yields a
    // different center value, proving the assertion is discriminating.
    const wrong = original.slice();
    applyClarityRef(wrong, w, h, 0.5);
    const wrongOut = wrong.slice();
    applySharpnessRef(wrongOut, wrong, w, h, 50); // neighbours from post-clarity
    expect(clamp255(wrongOut[idx] * 255)).not.toBe(img.data[idx]);
  });
});

/** Mirror of Uint8ClampedArray assignment (clamp + round-to-nearest-even). */
function clamp255(v: number): number {
  const arr = new Uint8ClampedArray(1);
  arr[0] = v;
  return arr[0];
}

function applyClarityRef(buf: Float32Array, width: number, height: number, v: number): void {
  const src = buf.slice();
  const strength = v * 0.5;
  const r = 2;
  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const idx = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0;
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) sum += src[((y + dy) * width + (x + dx)) * 4 + ch];
        const avg = sum / 25;
        const center = src[idx + ch];
        buf[idx + ch] = center + strength * (center - avg);
      }
    }
  }
}

function applySharpnessRef(
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
