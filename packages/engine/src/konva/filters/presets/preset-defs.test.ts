/**
 * @vitest-environment node
 *
 * Preset op-list consistency + TS/GLSL opcode-sync guards.
 *
 * 1. Each preset's CPU output equals directly-composed base-ops applied in the
 *    same array order (folding invariant).
 * 2. The TS `PRESET_OP` opcode numbers match the `const int` values baked into
 *    the generated GLSL string — guarding against silent TS/GLSL drift.
 * 3. No preset exceeds `MAX_PRESET_OPS` (the shader loop bound).
 */
import { describe, expect, it } from "vitest";
import {
  opBlackWhite,
  opBrightness,
  opColorFilter,
  opContrast,
  opGrayscale,
  opInvert,
  opRgbMul,
  opSaturation,
  opSepia,
  opSolarize,
} from "../base-ops";
import { createPresetFilter } from "../cpu-chain";
import { getPresetOps } from "./index";
import { PRESET_DEFS, type PresetOp } from "./preset-defs";
import { MAX_PRESET_OPS, PRESET_OP, PRESET_OPCODE_GLSL } from "./preset-opcodes";

/** Reference: fold a preset op list directly via base-ops in array order. */
function foldPresetOps(buf: Float32Array, ops: readonly PresetOp[]): void {
  for (const op of ops) {
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
}

function clamp255(v: number): number {
  const arr = new Uint8ClampedArray(1);
  arr[0] = v;
  return arr[0];
}

describe("PRESET_DEFS folding invariant", () => {
  // A representative colored pixel that exercises every op branch.
  const SAMPLE: readonly [number, number, number] = [180, 96, 40];

  for (const def of PRESET_DEFS) {
    it(`preset "${def.name}" folds its ops in array order`, () => {
      const data = new Uint8ClampedArray([...SAMPLE, 255]);
      const img = { data, width: 1, height: 1, colorSpace: "srgb" } as ImageData;
      createPresetFilter(def.ops)(img);

      const buf = Float32Array.from([SAMPLE[0] / 255, SAMPLE[1] / 255, SAMPLE[2] / 255, 1]);
      foldPresetOps(buf, def.ops);

      expect(img.data[0]).toBe(clamp255(buf[0] * 255));
      expect(img.data[1]).toBe(clamp255(buf[1] * 255));
      expect(img.data[2]).toBe(clamp255(buf[2] * 255));
    });
  }

  it("every preset fits within MAX_PRESET_OPS", () => {
    for (const def of PRESET_DEFS) {
      expect(def.ops.length).toBeLessThanOrEqual(MAX_PRESET_OPS);
    }
  });

  it("getPresetOps returns the exact ordered list from PRESET_DEFS", () => {
    for (const def of PRESET_DEFS) {
      expect(getPresetOps(def.name)).toBe(def.ops);
    }
    expect(getPresetOps("NotAPreset")).toBeUndefined();
  });
});

describe("TS/GLSL opcode sync", () => {
  /** Parse `const int OP_NAME = N;` lines from the generated GLSL. */
  function parseGlslOpcodes(src: string): Record<string, number> {
    const out: Record<string, number> = {};
    const re = /const int (OP_\w+)\s*=\s*(-?\d+);/g;
    for (const m of src.matchAll(re)) {
      out[m[1]] = Number(m[2]);
    }
    return out;
  }

  const GLSL_TO_TS: Record<string, keyof typeof PRESET_OP> = {
    OP_BRIGHTNESS: "BRIGHTNESS",
    OP_CONTRAST: "CONTRAST",
    OP_SATURATION: "SATURATION",
    OP_SEPIA: "SEPIA",
    OP_GRAYSCALE: "GRAYSCALE",
    OP_INVERT: "INVERT",
    OP_SOLARIZE: "SOLARIZE",
    OP_BLACKWHITE: "BLACKWHITE",
    OP_RGB: "RGB",
    OP_COLORFILTER: "COLORFILTER",
  };

  it("GLSL opcode constants match the TS PRESET_OP enum values", () => {
    const glsl = parseGlslOpcodes(PRESET_OPCODE_GLSL);
    for (const [glslName, tsKey] of Object.entries(GLSL_TO_TS)) {
      expect(glsl[glslName], `${glslName} present in GLSL`).toBe(PRESET_OP[tsKey]);
    }
    // Every TS opcode has a GLSL counterpart (no drift in either direction).
    expect(Object.keys(glsl).length).toBe(Object.keys(GLSL_TO_TS).length);
  });

  it("GLSL MAX_PRESET_OPS matches the TS constant", () => {
    const m = /const int MAX_PRESET_OPS\s*=\s*(\d+);/.exec(PRESET_OPCODE_GLSL);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBe(MAX_PRESET_OPS);
  });
});
