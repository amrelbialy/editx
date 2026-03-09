/**
 * Filter pipeline builder for Konva image nodes.
 *
 * Given the 12 adjustment values from an effect block, returns
 * the set of Konva filters and the attribute values to apply to
 * the node. Only includes filters for non-default values.
 */
import Konva from 'konva';
import { Temperature } from './warmth';
import { Sharpness } from './sharpness';
import { Exposure } from './exposure';
import { HighlightsShadows } from './highlights-shadows';
import { Gamma } from './gamma';
import { Clarity } from './clarity';
import { Blacks } from './blacks';
import { Whites } from './whites';

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

export interface FilterPipeline {
  /** Konva-compatible filter functions to apply. */
  filters: Array<(imageData: ImageData) => void>;
  /** Attribute values to set on the Konva node before cache(). */
  attrs: Record<string, number>;
  /** True if any adjustment is non-default and filters should be applied. */
  hasFilters: boolean;
}

/**
 * Build the filter pipeline from adjustment values.
 * Returns empty pipeline when all values are at default.
 */
export function buildFilterPipeline(values: AdjustmentValues): FilterPipeline {
  const filters: Array<(imageData: ImageData) => void> = [];
  const attrs: Record<string, number> = {};
  let hasFilters = false;

  // Brightness (Konva built-in)
  if (values.brightness !== 0) {
    filters.push(Konva.Filters.Brighten as any);
    attrs['brightness'] = values.brightness;
    hasFilters = true;
  }

  // Saturation (Konva built-in HSV — saturation component)
  if (values.saturation !== 0) {
    filters.push(Konva.Filters.HSV as any);
    attrs['saturation'] = values.saturation;
    hasFilters = true;
  }

  // Contrast (Konva built-in)
  if (values.contrast !== 0) {
    filters.push(Konva.Filters.Contrast as any);
    attrs['contrast'] = values.contrast * 100;
    hasFilters = true;
  }

  // Gamma (custom)
  if (values.gamma !== 0) {
    filters.push(Gamma);
    attrs['gamma'] = values.gamma;
    hasFilters = true;
  }

  // Clarity (custom)
  if (values.clarity !== 0) {
    filters.push(Clarity);
    attrs['clarity'] = values.clarity;
    hasFilters = true;
  }

  // Exposure (custom)
  if (values.exposure !== 0) {
    filters.push(Exposure);
    attrs['exposure'] = values.exposure;
    hasFilters = true;
  }

  // Highlights & Shadows (custom, combined)
  if (values.highlights !== 0 || values.shadows !== 0) {
    filters.push(HighlightsShadows);
    attrs['highlights'] = values.highlights;
    attrs['shadows'] = values.shadows;
    hasFilters = true;
  }

  // Blacks (custom)
  if (values.blacks !== 0) {
    filters.push(Blacks);
    attrs['blacks'] = values.blacks;
    hasFilters = true;
  }

  // Whites (custom)
  if (values.whites !== 0) {
    filters.push(Whites);
    attrs['whites'] = values.whites;
    hasFilters = true;
  }

  // Temperature (custom)
  if (values.temperature !== 0) {
    filters.push(Temperature);
    attrs['temperature'] = values.temperature;
    hasFilters = true;
  }

  // Sharpness (custom)
  if (values.sharpness !== 0) {
    filters.push(Sharpness);
    attrs['sharpness'] = values.sharpness;
    hasFilters = true;
  }

  return { filters, attrs, hasFilters };
}
