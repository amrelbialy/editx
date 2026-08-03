/**
 * Data-driven preset definitions.
 *
 * Each preset is an ordered list of {@link PresetOp}s. Both the CPU chain
 * (see `cpu-chain.ts`) and the WebGL shader consume this same ordered list,
 * so the two rendering paths produce identical results. Preset ops always
 * run AFTER the 11 adjustment ops, on the same working buffer, with a single
 * trailing clamp.
 *
 * Op order within each preset is preserved exactly from the historical
 * per-preset implementations.
 */

export type PresetOp =
  | { op: "brightness"; value: number }
  | { op: "contrast"; value: number }
  | { op: "saturation"; value: number }
  | { op: "sepia"; value: number }
  | { op: "grayscale" }
  | { op: "invert" }
  | { op: "solarize" }
  | { op: "blackWhite"; threshold: number } // 0..255
  | { op: "rgb"; value: [number, number, number] }
  | { op: "colorFilter"; value: [number, number, number, number] }; // r,g,b 0..255, a 0..1

export interface PresetDef {
  /** Registry key + preset name persisted on blocks. */
  name: string;
  /** Display label for the UI. */
  label: string;
  /** Ordered op list, applied in array order. */
  ops: readonly PresetOp[];
  /** True for presets historically backed by a Konva built-in filter. */
  konva?: boolean;
}

// ── op constructors (keep the data table compact) ──
const b = (value: number): PresetOp => ({ op: "brightness", value });
const c = (value: number): PresetOp => ({ op: "contrast", value });
const s = (value: number): PresetOp => ({ op: "saturation", value });
const sep = (value: number): PresetOp => ({ op: "sepia", value });
const gray: PresetOp = { op: "grayscale" };
const rgb = (r: number, g: number, bl: number): PresetOp => ({ op: "rgb", value: [r, g, bl] });
const cf = (r: number, g: number, bl: number, a: number): PresetOp => ({
  op: "colorFilter",
  value: [r, g, bl, a],
});

/**
 * All presets in UI display order. The registry (`presets/index.ts`) and the
 * WebGL renderer both derive from this table.
 */
export const PRESET_DEFS: readonly PresetDef[] = [
  // ── built-in style presets ──
  { name: "Invert", label: "Invert", konva: true, ops: [{ op: "invert" }] },
  { name: "BlackAndWhite", label: "B&W", ops: [{ op: "blackWhite", threshold: 100 }] },
  { name: "Sepia", label: "Sepia", konva: true, ops: [sep(1)] },
  { name: "Solarize", label: "Solarize", konva: true, ops: [{ op: "solarize" }] },

  // ── custom presets ──
  { name: "Clarendon", label: "Clarendon", ops: [b(0.1), c(0.1), s(0.15)] },
  { name: "Gingham", label: "Gingham", ops: [sep(0.04), c(-0.15)] },
  { name: "Moon", label: "Moon", ops: [gray, b(0.1)] },
  { name: "Lark", label: "Lark", ops: [b(0.08), rgb(1, 1.03, 1.05), s(0.12)] },
  { name: "Reyes", label: "Reyes", ops: [sep(0.4), b(0.13), c(-0.05)] },
  { name: "Juno", label: "Juno", ops: [rgb(1.01, 1.04, 1), s(0.3)] },
  { name: "Slumber", label: "Slumber", ops: [b(0.1), s(-0.5)] },
  { name: "Crema", label: "Crema", ops: [rgb(1.04, 1, 1.02), s(-0.05)] },
  { name: "Ludwig", label: "Ludwig", ops: [b(0.05), s(-0.03)] },
  { name: "Aden", label: "Aden", ops: [cf(228, 130, 225, 0.13), s(-0.2)] },
  { name: "Perpetua", label: "Perpetua", ops: [rgb(1.05, 1.1, 1)] },
  { name: "Amaro", label: "Amaro", ops: [s(0.3), b(0.15)] },
  { name: "Mayfair", label: "Mayfair", ops: [cf(230, 115, 108, 0.05), s(0.15)] },
  { name: "Rise", label: "Rise", ops: [cf(255, 170, 0, 0.1), b(0.09), s(0.1)] },
  { name: "Hudson", label: "Hudson", ops: [rgb(1, 1, 1.25), c(0.1), b(0.15)] },
  { name: "Valencia", label: "Valencia", ops: [cf(255, 225, 80, 0.08), s(0.1), c(0.05)] },
  { name: "XPro2", label: "X-Pro II", ops: [cf(255, 255, 0, 0.07), s(0.2), c(0.15)] },
  { name: "Sierra", label: "Sierra", ops: [c(-0.15), s(0.1)] },
  { name: "Willow", label: "Willow", ops: [gray, cf(100, 28, 210, 0.03), b(0.1)] },
  { name: "LoFi", label: "Lo-Fi", ops: [c(0.15), s(0.2)] },
  { name: "Inkwell", label: "Inkwell", konva: true, ops: [gray] },
  { name: "Hefe", label: "Hefe", ops: [c(0.1), s(0.15)] },
  { name: "Nashville", label: "Nashville", ops: [cf(220, 115, 188, 0.12), c(-0.05)] },
  { name: "Stinson", label: "Stinson", ops: [b(0.1), sep(0.3)] },
  { name: "Vesper", label: "Vesper", ops: [cf(255, 225, 0, 0.05), b(0.06), c(0.06)] },
  { name: "Earlybird", label: "Earlybird", ops: [cf(255, 165, 40, 0.2)] },
  { name: "Brannan", label: "Brannan", ops: [c(0.2), cf(140, 10, 185, 0.1)] },
  { name: "Sutro", label: "Sutro", ops: [b(-0.1), s(-0.1)] },
  { name: "Toaster", label: "Toaster", ops: [sep(0.1), cf(255, 145, 0, 0.2)] },
  { name: "Walden", label: "Walden", ops: [b(0.1), cf(255, 255, 0, 0.2)] },
  { name: "1977", label: "1977", ops: [cf(255, 25, 0, 0.15), b(0.1)] },
  { name: "Kelvin", label: "Kelvin", ops: [cf(255, 140, 0, 0.1), rgb(1.15, 1.05, 1), s(0.35)] },
  { name: "Maven", label: "Maven", ops: [cf(225, 240, 0, 0.1), s(0.25), c(0.05)] },
  { name: "Ginza", label: "Ginza", ops: [sep(0.06), b(0.1)] },
  { name: "Skyline", label: "Skyline", ops: [s(0.35), b(0.1)] },
  { name: "Dogpatch", label: "Dogpatch", ops: [c(0.15), b(0.1)] },
  { name: "Brooklyn", label: "Brooklyn", ops: [cf(25, 240, 252, 0.05), sep(0.3)] },
  { name: "Helena", label: "Helena", ops: [cf(208, 208, 86, 0.2), c(0.15)] },
  { name: "Ashby", label: "Ashby", ops: [cf(255, 160, 25, 0.1), b(0.1)] },
  { name: "Charmes", label: "Charmes", ops: [cf(255, 50, 80, 0.12), c(0.05)] },
];
