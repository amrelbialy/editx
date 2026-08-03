/**
 * Shared preset opcode constants.
 *
 * These integer opcodes are the single source of truth for both the
 * CPU preset applier and the WebGL shader's preset-op loop. The GLSL
 * declarations are generated from the same numbers via
 * {@link PRESET_OPCODE_GLSL} and injected into the fragment shader, so
 * the two paths can never drift out of sync.
 */
import type { PresetOp } from "./preset-defs";

/** Maximum number of preset ops the shader loop supports. */
export const MAX_PRESET_OPS = 8;

/** Integer opcode for each preset op kind. Mirrored in GLSL. */
export const PRESET_OP = {
  BRIGHTNESS: 1,
  CONTRAST: 2,
  SATURATION: 3,
  SEPIA: 4,
  GRAYSCALE: 5,
  INVERT: 6,
  SOLARIZE: 7,
  BLACKWHITE: 8,
  RGB: 9,
  COLORFILTER: 10,
} as const;

/** A preset op encoded for GPU upload: opcode + 4 float params. */
export interface EncodedPresetOp {
  type: number;
  params: [number, number, number, number];
}

/**
 * Encode a {@link PresetOp} into the (opcode, vec4 params) form the shader
 * consumes. Colors are normalized to 0..1; unused slots are zero-padded.
 */
export function encodePresetOp(op: PresetOp): EncodedPresetOp {
  switch (op.op) {
    case "brightness":
      return { type: PRESET_OP.BRIGHTNESS, params: [op.value, 0, 0, 0] };
    case "contrast":
      return { type: PRESET_OP.CONTRAST, params: [op.value, 0, 0, 0] };
    case "saturation":
      return { type: PRESET_OP.SATURATION, params: [op.value, 0, 0, 0] };
    case "sepia":
      return { type: PRESET_OP.SEPIA, params: [op.value, 0, 0, 0] };
    case "grayscale":
      return { type: PRESET_OP.GRAYSCALE, params: [0, 0, 0, 0] };
    case "invert":
      return { type: PRESET_OP.INVERT, params: [0, 0, 0, 0] };
    case "solarize":
      return { type: PRESET_OP.SOLARIZE, params: [0, 0, 0, 0] };
    case "blackWhite":
      return { type: PRESET_OP.BLACKWHITE, params: [op.threshold / 255, 0, 0, 0] };
    case "rgb":
      return { type: PRESET_OP.RGB, params: [op.value[0], op.value[1], op.value[2], 0] };
    case "colorFilter":
      return {
        type: PRESET_OP.COLORFILTER,
        params: [op.value[0] / 255, op.value[1] / 255, op.value[2] / 255, op.value[3]],
      };
  }
}

/**
 * GLSL declarations for the opcode constants + array size. Injected into
 * the fragment shader source so the shader and TypeScript stay in lockstep.
 */
export const PRESET_OPCODE_GLSL = `const int MAX_PRESET_OPS = ${MAX_PRESET_OPS};
const int OP_BRIGHTNESS  = ${PRESET_OP.BRIGHTNESS};
const int OP_CONTRAST    = ${PRESET_OP.CONTRAST};
const int OP_SATURATION  = ${PRESET_OP.SATURATION};
const int OP_SEPIA       = ${PRESET_OP.SEPIA};
const int OP_GRAYSCALE   = ${PRESET_OP.GRAYSCALE};
const int OP_INVERT      = ${PRESET_OP.INVERT};
const int OP_SOLARIZE    = ${PRESET_OP.SOLARIZE};
const int OP_BLACKWHITE  = ${PRESET_OP.BLACKWHITE};
const int OP_RGB         = ${PRESET_OP.RGB};
const int OP_COLORFILTER = ${PRESET_OP.COLORFILTER};`;
