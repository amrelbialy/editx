/**
 * Preset uniform data for the WebGL filter renderer.
 *
 * Each preset from the CPU pipeline is converted to a set of
 * float/vec uniform values that the GLSL shader consumes directly.
 * This eliminates per-pixel JS loops for preset effects.
 */

export interface PresetUniforms {
 brightness: number;
 contrast: number;
 saturation: number;
 sepia: number;
 grayscale: number;
 /** RGB multiplier, default [1, 1, 1] */
 rgb: [number, number, number];
 /** Color filter [r, g, b, alpha] in 0..1 range */
 colorFilter: [number, number, number, number];
 /** 1.0 to enable invert, 0.0 to disable */
 invert: number;
 /** 1.0 to enable solarize, 0.0 to disable */
 solarize: number;
 /** 1.0 to enable black & white threshold, 0.0 to disable */
 blackWhite: number;
}

function p(overrides: Partial<PresetUniforms> = {}): PresetUniforms {
 return {
 brightness: 0,
 contrast: 0,
 saturation: 0,
 sepia: 0,
 grayscale: 0,
 rgb: [1, 1, 1],
 colorFilter: [0, 0, 0, 0],
 invert: 0,
 solarize: 0,
 blackWhite: 0,
 ...overrides,
 };
}

/** Convert 0-255 RGBA to 0-1 range for the shader. */
function cf(r: number, g: number, b: number, a: number): [number, number, number, number] {
 return [r / 255, g / 255, b / 255, a];
}

/**
 * All preset uniform data, keyed by preset name.
 * Values match the CPU implementations in presets/index.ts.
 */
export const PRESET_UNIFORMS: ReadonlyMap<string, PresetUniforms> = new Map([
 // ── Konva built-in presets ──
 ["Invert", p({ invert: 1 })],
 ["BlackAndWhite", p({ blackWhite: 1 })],
 ["Sepia", p({ sepia: 1 })],
 ["Solarize", p({ solarize: 1 })],

 // ── Custom presets ──
 ["Clarendon", p({ brightness: 0.1, contrast: 0.1, saturation: 0.15 })],
 ["Gingham", p({ sepia: 0.04, contrast: -0.15 })],
 ["Moon", p({ grayscale: 1, brightness: 0.1 })],
 ["Lark", p({ brightness: 0.08, rgb: [1, 1.03, 1.05], saturation: 0.12 })],
 ["Reyes", p({ sepia: 0.4, brightness: 0.13, contrast: -0.05 })],
 ["Juno", p({ rgb: [1.01, 1.04, 1], saturation: 0.3 })],
 ["Slumber", p({ brightness: 0.1, saturation: -0.5 })],
 ["Crema", p({ rgb: [1.04, 1, 1.02], saturation: -0.05 })],
 ["Ludwig", p({ brightness: 0.05, saturation: -0.03 })],
 ["Aden", p({ colorFilter: cf(228, 130, 225, 0.13), saturation: -0.2 })],
 ["Perpetua", p({ rgb: [1.05, 1.1, 1] })],
 ["Amaro", p({ saturation: 0.3, brightness: 0.15 })],
 ["Mayfair", p({ colorFilter: cf(230, 115, 108, 0.05), saturation: 0.15 })],
 ["Rise", p({ colorFilter: cf(255, 170, 0, 0.1), brightness: 0.09, saturation: 0.1 })],
 ["Hudson", p({ rgb: [1, 1, 1.25], contrast: 0.1, brightness: 0.15 })],
 ["Valencia", p({ colorFilter: cf(255, 225, 80, 0.08), saturation: 0.1, contrast: 0.05 })],
 ["XPro2", p({ colorFilter: cf(255, 255, 0, 0.07), saturation: 0.2, contrast: 0.15 })],
 ["Sierra", p({ contrast: -0.15, saturation: 0.1 })],
 ["Willow", p({ grayscale: 1, colorFilter: cf(100, 28, 210, 0.03), brightness: 0.1 })],
 ["LoFi", p({ contrast: 0.15, saturation: 0.2 })],
 ["Inkwell", p({ grayscale: 1 })],
 ["Hefe", p({ contrast: 0.1, saturation: 0.15 })],
 ["Nashville", p({ colorFilter: cf(220, 115, 188, 0.12), contrast: -0.05 })],
 ["Stinson", p({ brightness: 0.1, sepia: 0.3 })],
 ["Vesper", p({ colorFilter: cf(255, 225, 0, 0.05), brightness: 0.06, contrast: 0.06 })],
 ["Earlybird", p({ colorFilter: cf(255, 165, 40, 0.2) })],
 ["Brannan", p({ contrast: 0.2, colorFilter: cf(140, 10, 185, 0.1) })],
 ["Sutro", p({ brightness: -0.1, saturation: -0.1 })],
 ["Toaster", p({ sepia: 0.1, colorFilter: cf(255, 145, 0, 0.2) })],
 ["Walden", p({ brightness: 0.1, colorFilter: cf(255, 255, 0, 0.2) })],
 ["1977", p({ colorFilter: cf(255, 25, 0, 0.15), brightness: 0.1 })],
 ["Kelvin", p({ colorFilter: cf(255, 140, 0, 0.1), rgb: [1.15, 1.05, 1], saturation: 0.35 })],
 ["Maven", p({ colorFilter: cf(225, 240, 0, 0.1), saturation: 0.25, contrast: 0.05 })],
 ["Ginza", p({ sepia: 0.06, brightness: 0.1 })],
 ["Skyline", p({ saturation: 0.35, brightness: 0.1 })],
 ["Dogpatch", p({ contrast: 0.15, brightness: 0.1 })],
 ["Brooklyn", p({ colorFilter: cf(25, 240, 252, 0.05), sepia: 0.3 })],
 ["Helena", p({ colorFilter: cf(208, 208, 86, 0.2), contrast: 0.15 })],
 ["Ashby", p({ colorFilter: cf(255, 160, 25, 0.1), brightness: 0.1 })],
 ["Charmes", p({ colorFilter: cf(255, 50, 80, 0.12), contrast: 0.05 })],
]);
