/**
 * Adjustment value shape + helpers.
 *
 * The historical Konva-filter list builder has been replaced by the single
 * ordered CPU runner (`cpu-chain.ts`) and the WebGL shader. This module now
 * only defines the adjustment value shape and a default-detection helper.
 */

export interface AdjustmentValues {
  brightness: number;
  saturation: number;
  contrast: number;
  gamma: number;
  clarity: number;
  exposure: number;
  shadows: number;
  highlights: number;
  blacks: number;
  whites: number;
  temperature: number;
  sharpness: number;
}

/** True if any adjustment is non-default (i.e. filtering would change pixels). */
export function hasAnyAdjustment(values: AdjustmentValues): boolean {
  return (
    values.brightness !== 0 ||
    values.saturation !== 0 ||
    values.contrast !== 0 ||
    values.gamma !== 0 ||
    values.clarity !== 0 ||
    values.exposure !== 0 ||
    values.shadows !== 0 ||
    values.highlights !== 0 ||
    values.blacks !== 0 ||
    values.whites !== 0 ||
    values.temperature !== 0 ||
    values.sharpness !== 0
  );
}
