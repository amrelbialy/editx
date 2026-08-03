/**
 * Single ordered CPU filter runner.
 *
 * Applies the 11 adjustment ops followed by the preset ops in the canonical
 * order, on one Float32 working buffer, with a single trailing clamp when
 * writing back to the `Uint8ClampedArray`. This mirrors the WebGL shader's
 * op order and per-op semantics (including spatial-op neighbour sampling), so
 * both paths produce equivalent output modulo float precision and the final
 * uint8 clamp/round.
 *
 * Canonical order:
 *   1 clarity · 2 sharpness · 3 brightness · 4 saturation · 5 contrast
 *   6 gamma · 7 exposure · 8 highlights/shadows · 9 blacks · 10 whites
 *   11 temperature · then preset ops (in list order)
 */

import {
  opBlacks,
  opBlackWhite,
  opBrightness,
  opClarity,
  opColorFilter,
  opContrast,
  opExposure,
  opGamma,
  opGrayscale,
  opHighlightsShadows,
  opInvert,
  opRgbMul,
  opSaturation,
  opSepia,
  opSharpness,
  opSolarize,
  opTemperature,
  opWhites,
} from "./base-ops";
import type { AdjustmentValues } from "./build-filter-pipeline";
import type { PresetOp } from "./presets/preset-defs";

function applyPresetOp(buf: Float32Array, op: PresetOp): void {
  switch (op.op) {
    case "brightness":
      opBrightness(buf, op.value);
      break;
    case "contrast":
      opContrast(buf, op.value);
      break;
    case "saturation":
      opSaturation(buf, op.value);
      break;
    case "sepia":
      opSepia(buf, op.value);
      break;
    case "grayscale":
      opGrayscale(buf);
      break;
    case "invert":
      opInvert(buf);
      break;
    case "solarize":
      opSolarize(buf);
      break;
    case "blackWhite":
      opBlackWhite(buf, op.threshold / 255);
      break;
    case "rgb":
      opRgbMul(buf, op.value);
      break;
    case "colorFilter":
      opColorFilter(buf, [op.value[0] / 255, op.value[1] / 255, op.value[2] / 255, op.value[3]]);
      break;
  }
}

/**
 * Run the full ordered filter chain in place on `imageData`.
 * `values` may be null (preset-only). `presetOps` may be empty (adjust-only).
 */
export function applyFilterChain(
  imageData: ImageData,
  values: AdjustmentValues | null,
  presetOps: readonly PresetOp[],
): void {
  const { data, width, height } = imageData;
  const n = data.length;

  // Convert to a normalized 0..1 working buffer (alpha copied but untouched).
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = data[i] / 255;

  if (values) {
    // Sharpness samples its neighbour averages from the ORIGINAL (pre-clarity)
    // buffer, matching the single-pass shader which can only sample u_image.
    const spatialSource = values.sharpness !== 0 ? buf.slice() : null;
    if (values.clarity !== 0) opClarity(buf, width, height, values.clarity);
    if (values.sharpness !== 0 && spatialSource) {
      opSharpness(buf, spatialSource, width, height, values.sharpness);
    }
    if (values.brightness !== 0) opBrightness(buf, values.brightness);
    if (values.saturation !== 0) opSaturation(buf, values.saturation);
    if (values.contrast !== 0) opContrast(buf, values.contrast);
    if (values.gamma !== 0) opGamma(buf, values.gamma);
    if (values.exposure !== 0) opExposure(buf, values.exposure);
    if (values.highlights !== 0 || values.shadows !== 0) {
      opHighlightsShadows(buf, values.highlights, values.shadows);
    }
    if (values.blacks !== 0) opBlacks(buf, values.blacks);
    if (values.whites !== 0) opWhites(buf, values.whites);
    if (values.temperature !== 0) opTemperature(buf, values.temperature);
  }

  for (const op of presetOps) applyPresetOp(buf, op);

  // Single trailing clamp: assigning to a Uint8ClampedArray clamps 0..255.
  for (let i = 0; i < n; i += 4) {
    data[i] = buf[i] * 255;
    data[i + 1] = buf[i + 1] * 255;
    data[i + 2] = buf[i + 2] * 255;
  }
}

/** Build a Konva-compatible filter fn that applies only the given preset ops. */
export function createPresetFilter(ops: readonly PresetOp[]): (imageData: ImageData) => void {
  return (imageData: ImageData) => applyFilterChain(imageData, null, ops);
}
