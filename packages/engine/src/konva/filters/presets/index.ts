import { BaseFilters } from '../base-filters';

export interface FilterPresetInfo {
  /** Display label for the UI */
  label: string;
  /** Filter function to apply — mutates ImageData in-place */
  filter: (imageData: ImageData) => void;
  /** 'custom' = pixel-manipulation, 'konva' = built-in Konva filter */
  type: 'custom' | 'konva';
}

// ── Custom presets (ported from filerobot) ──────────────

function clarendon(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.brightness(0.1),
    BaseFilters.contrast(0.1),
    BaseFilters.saturation(0.15),
  );
}

function gingham(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.sepia(0.04),
    BaseFilters.contrast(-0.15),
  );
}

function moon(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.grayscale(),
    BaseFilters.brightness(0.1),
  );
}

function lark(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.brightness(0.08),
    BaseFilters.adjustRGB([1, 1.03, 1.05]),
    BaseFilters.saturation(0.12),
  );
}

function reyes(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.sepia(0.4),
    BaseFilters.brightness(0.13),
    BaseFilters.contrast(-0.05),
  );
}

function juno(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.adjustRGB([1.01, 1.04, 1]),
    BaseFilters.saturation(0.3),
  );
}

function aden(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([228, 130, 225, 0.13]),
    BaseFilters.saturation(-0.2),
  );
}

function amaro(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.saturation(0.3),
    BaseFilters.brightness(0.15),
  );
}

function valencia(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 225, 80, 0.08]),
    BaseFilters.saturation(0.1),
    BaseFilters.contrast(0.05),
  );
}

function hudson(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.adjustRGB([1, 1, 1.25]),
    BaseFilters.contrast(0.1),
    BaseFilters.brightness(0.15),
  );
}

function rise(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 170, 0, 0.1]),
    BaseFilters.brightness(0.09),
    BaseFilters.saturation(0.1),
  );
}

function earlybird(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 165, 40, 0.2]),
  );
}

function nashville(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([220, 115, 188, 0.12]),
    BaseFilters.contrast(-0.05),
  );
}

function brooklyn(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([25, 240, 252, 0.05]),
    BaseFilters.sepia(0.3),
  );
}

function willow(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.grayscale(),
    BaseFilters.colorFilter([100, 28, 210, 0.03]),
    BaseFilters.brightness(0.1),
  );
}

function blackAndWhite(imageData: ImageData): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const val = avg > 100 ? 255 : 0;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }
}

function slumber(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.brightness(0.1), BaseFilters.saturation(-0.5));
}

function crema(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.adjustRGB([1.04, 1, 1.02]), BaseFilters.saturation(-0.05));
}

function ludwig(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.brightness(0.05), BaseFilters.saturation(-0.03));
}

function perpetua(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.adjustRGB([1.05, 1.1, 1]));
}

function mayfair(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.colorFilter([230, 115, 108, 0.05]), BaseFilters.saturation(0.15));
}

function xpro2(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 255, 0, 0.07]),
    BaseFilters.saturation(0.2),
    BaseFilters.contrast(0.15),
  );
}

function sierra(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.contrast(-0.15), BaseFilters.saturation(0.1));
}

function lofi(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.contrast(0.15), BaseFilters.saturation(0.2));
}

function hefe(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.contrast(0.1), BaseFilters.saturation(0.15));
}

function stinson(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.brightness(0.1), BaseFilters.sepia(0.3));
}

function vesper(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 225, 0, 0.05]),
    BaseFilters.brightness(0.06),
    BaseFilters.contrast(0.06),
  );
}

function brannan(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.contrast(0.2), BaseFilters.colorFilter([140, 10, 185, 0.1]));
}

function sutro(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.brightness(-0.1), BaseFilters.saturation(-0.1));
}

function toaster(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.sepia(0.1), BaseFilters.colorFilter([255, 145, 0, 0.2]));
}

function walden(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.brightness(0.1), BaseFilters.colorFilter([255, 255, 0, 0.2]));
}

function nineteenSeventySeven(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.colorFilter([255, 25, 0, 0.15]), BaseFilters.brightness(0.1));
}

function kelvin(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([255, 140, 0, 0.1]),
    BaseFilters.adjustRGB([1.15, 1.05, 1]),
    BaseFilters.saturation(0.35),
  );
}

function maven(imageData: ImageData): void {
  BaseFilters.apply(
    imageData,
    BaseFilters.colorFilter([225, 240, 0, 0.1]),
    BaseFilters.saturation(0.25),
    BaseFilters.contrast(0.05),
  );
}

function ginza(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.sepia(0.06), BaseFilters.brightness(0.1));
}

function skyline(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.saturation(0.35), BaseFilters.brightness(0.1));
}

function dogpatch(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.contrast(0.15), BaseFilters.brightness(0.1));
}

function helena(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.colorFilter([208, 208, 86, 0.2]), BaseFilters.contrast(0.15));
}

function ashby(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.colorFilter([255, 160, 25, 0.1]), BaseFilters.brightness(0.1));
}

function charmes(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.colorFilter([255, 50, 80, 0.12]), BaseFilters.contrast(0.05));
}

// ── Konva built-in presets ──────────────────────────────

function konvaInvert(imageData: ImageData): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
}

function konvaSepia(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.sepia(1));
}

function konvaSolarize(imageData: ImageData): void {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] > 127 ? 255 - d[i] : d[i];
    d[i + 1] = d[i + 1] > 127 ? 255 - d[i + 1] : d[i + 1];
    d[i + 2] = d[i + 2] > 127 ? 255 - d[i + 2] : d[i + 2];
  }
}

function konvaGrayscale(imageData: ImageData): void {
  BaseFilters.apply(imageData, BaseFilters.grayscale());
}

// ── Registry ────────────────────────────────────────────

/**
 * All available filter presets, keyed by name.
 * Order here determines display order in the UI.
 */
export const FILTER_PRESETS: ReadonlyMap<string, FilterPresetInfo> = new Map([
  // Konva built-in presets (re-implemented as ImageData ops for uniform pipeline)
  ['Invert', { label: 'Invert', filter: konvaInvert, type: 'konva' }],
  ['BlackAndWhite', { label: 'B&W', filter: blackAndWhite, type: 'custom' }],
  ['Sepia', { label: 'Sepia', filter: konvaSepia, type: 'konva' }],
  ['Solarize', { label: 'Solarize', filter: konvaSolarize, type: 'konva' }],
  // Custom presets (ported from filerobot, ordered to match)
  ['Clarendon', { label: 'Clarendon', filter: clarendon, type: 'custom' }],
  ['Gingham', { label: 'Gingham', filter: gingham, type: 'custom' }],
  ['Moon', { label: 'Moon', filter: moon, type: 'custom' }],
  ['Lark', { label: 'Lark', filter: lark, type: 'custom' }],
  ['Reyes', { label: 'Reyes', filter: reyes, type: 'custom' }],
  ['Juno', { label: 'Juno', filter: juno, type: 'custom' }],
  ['Slumber', { label: 'Slumber', filter: slumber, type: 'custom' }],
  ['Crema', { label: 'Crema', filter: crema, type: 'custom' }],
  ['Ludwig', { label: 'Ludwig', filter: ludwig, type: 'custom' }],
  ['Aden', { label: 'Aden', filter: aden, type: 'custom' }],
  ['Perpetua', { label: 'Perpetua', filter: perpetua, type: 'custom' }],
  ['Amaro', { label: 'Amaro', filter: amaro, type: 'custom' }],
  ['Mayfair', { label: 'Mayfair', filter: mayfair, type: 'custom' }],
  ['Rise', { label: 'Rise', filter: rise, type: 'custom' }],
  ['Hudson', { label: 'Hudson', filter: hudson, type: 'custom' }],
  ['Valencia', { label: 'Valencia', filter: valencia, type: 'custom' }],
  ['XPro2', { label: 'X-Pro II', filter: xpro2, type: 'custom' }],
  ['Sierra', { label: 'Sierra', filter: sierra, type: 'custom' }],
  ['Willow', { label: 'Willow', filter: willow, type: 'custom' }],
  ['LoFi', { label: 'Lo-Fi', filter: lofi, type: 'custom' }],
  ['Inkwell', { label: 'Inkwell', filter: konvaGrayscale, type: 'konva' }],
  ['Hefe', { label: 'Hefe', filter: hefe, type: 'custom' }],
  ['Nashville', { label: 'Nashville', filter: nashville, type: 'custom' }],
  ['Stinson', { label: 'Stinson', filter: stinson, type: 'custom' }],
  ['Vesper', { label: 'Vesper', filter: vesper, type: 'custom' }],
  ['Earlybird', { label: 'Earlybird', filter: earlybird, type: 'custom' }],
  ['Brannan', { label: 'Brannan', filter: brannan, type: 'custom' }],
  ['Sutro', { label: 'Sutro', filter: sutro, type: 'custom' }],
  ['Toaster', { label: 'Toaster', filter: toaster, type: 'custom' }],
  ['Walden', { label: 'Walden', filter: walden, type: 'custom' }],
  ['1977', { label: '1977', filter: nineteenSeventySeven, type: 'custom' }],
  ['Kelvin', { label: 'Kelvin', filter: kelvin, type: 'custom' }],
  ['Maven', { label: 'Maven', filter: maven, type: 'custom' }],
  ['Ginza', { label: 'Ginza', filter: ginza, type: 'custom' }],
  ['Skyline', { label: 'Skyline', filter: skyline, type: 'custom' }],
  ['Dogpatch', { label: 'Dogpatch', filter: dogpatch, type: 'custom' }],
  ['Brooklyn', { label: 'Brooklyn', filter: brooklyn, type: 'custom' }],
  ['Helena', { label: 'Helena', filter: helena, type: 'custom' }],
  ['Ashby', { label: 'Ashby', filter: ashby, type: 'custom' }],
  ['Charmes', { label: 'Charmes', filter: charmes, type: 'custom' }],
]);

/** Get the filter function for a preset name, or undefined if not found. */
export function getFilterPreset(name: string): ((imageData: ImageData) => void) | undefined {
  return FILTER_PRESETS.get(name)?.filter;
}
