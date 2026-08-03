/**
 * @vitest-environment node
 *
 * WebGL/CPU formula parity — deterministic subset achievable without a real
 * GPU.
 *
 * happy-dom/Vitest has no WebGL2 rasterizer, so full GPU pixel parity belongs
 * in Playwright CT (out of scope here). Instead we assert the two paths share
 * the SAME formulas by:
 *   (a) confirming the canonical formula text is present in the GLSL source
 *       (guards against someone editing the shader math independently), and
 *   (b) evaluating faithful JS transcriptions of the shader expressions and
 *       checking they match the `base-ops.ts` primitives numerically.
 * If either path's formula changes, one of these assertions breaks.
 */
import { describe, expect, it } from "vitest";
import { FRAGMENT_SRC } from "../glsl-filter-shaders";
import {
  opBrightness,
  opContrast,
  opExposure,
  opGamma,
  opInvert,
  opSaturation,
  opTemperature,
} from "./base-ops";

/** Strip whitespace so formula-substring checks ignore formatting. */
function squash(s: string): string {
  return s.replace(/\s+/g, "");
}

const GLSL = squash(FRAGMENT_SRC);

function cpuOne(op: (b: Float32Array) => void, r: number, g: number, b: number): number[] {
  const buf = Float32Array.from([r, g, b, 1]);
  op(buf);
  return [buf[0], buf[1], buf[2]];
}

describe("GLSL source contains the canonical formulas", () => {
  it("contrast uses factor = (1+v)^2 about 0.5", () => {
    // vec3 out = (c - 0.5) * f + 0.5; f = (1.0 + val) * (1.0 + val)
    expect(GLSL).toContain(squash("float f = (1.0 + val) * (1.0 + val);"));
    expect(GLSL).toContain(squash("return (c - 0.5) * f + 0.5;"));
  });

  it("saturation mixes toward luma with 0.2989/0.587/0.114 weights", () => {
    expect(GLSL).toContain(squash("dot(c, vec3(0.2989, 0.587, 0.114))"));
    expect(GLSL).toContain(squash("mix(vec3(lum), c, 1.0 + val)"));
  });

  it("gamma uses 1/(1+v) with a non-negative base", () => {
    expect(GLSL).toContain(squash("float correction = 1.0 / (1.0 + val);"));
    expect(GLSL).toContain(squash("pow(max(c, vec3(0.0)), vec3(correction))"));
  });

  it("exposure multiplies by pow(2, v)", () => {
    expect(GLSL).toContain(squash("c * pow(2.0, val)"));
  });

  it("temperature shifts r up / b down by val*40/255", () => {
    expect(GLSL).toContain(squash("float shift = val * (40.0 / 255.0);"));
  });

  it("solarize inverts at step(0.5, color) — matching CPU >= 0.5", () => {
    expect(GLSL).toContain(squash("mix(color, 1.0 - color, step(0.5, color))"));
  });
});

describe("shader expression transcriptions match base-ops numerically", () => {
  // Faithful JS transcriptions of the GLSL expressions above, evaluated on the
  // same inputs as the CPU primitives.
  const R = 0.72;
  const G = 0.31;
  const B = 0.15;

  it("brightness parity", () => {
    const v = 0.2;
    const glsl = [R + v, G + v, B + v];
    const cpu = cpuOne((b) => opBrightness(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("contrast parity", () => {
    const v = 0.4;
    const f = (1 + v) * (1 + v);
    const glsl = [R, G, B].map((c) => (c - 0.5) * f + 0.5);
    const cpu = cpuOne((b) => opContrast(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("saturation parity", () => {
    const v = 0.5;
    const lum = 0.2989 * R + 0.587 * G + 0.114 * B;
    const mix = (a: number, c: number, t: number) => a + (c - a) * t; // GLSL mix
    const glsl = [R, G, B].map((c) => mix(lum, c, 1 + v));
    const cpu = cpuOne((b) => opSaturation(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("gamma parity", () => {
    const v = 0.3;
    const correction = 1 / (1 + v);
    const glsl = [R, G, B].map((c) => Math.max(0, c) ** correction);
    const cpu = cpuOne((b) => opGamma(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("exposure parity", () => {
    const v = -0.4;
    const glsl = [R, G, B].map((c) => c * 2 ** v);
    const cpu = cpuOne((b) => opExposure(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("temperature parity", () => {
    const v = 0.6;
    const shift = (v * 40) / 255;
    const glsl = [R + shift, G, B - shift];
    const cpu = cpuOne((b) => opTemperature(b, v), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });

  it("invert parity", () => {
    const glsl = [1 - R, 1 - G, 1 - B];
    const cpu = cpuOne((b) => opInvert(b), R, G, B);
    for (let i = 0; i < 3; i++) expect(cpu[i]).toBeCloseTo(glsl[i], 6);
  });
});

describe("GLSL op order matches the canonical CPU order", () => {
  it("clarity + sharpness run before per-pixel adjustments; presets run last", () => {
    const src = FRAGMENT_SRC;
    const iClarity = src.indexOf("applyClarity(color");
    const iSharp = src.indexOf("applySharpness(color");
    const iBrightness = src.indexOf("applyBrightness(color, u_brightness)");
    const iContrast = src.indexOf("applyContrast(color, u_contrast)");
    const iTemp = src.indexOf("applyTemperature(color, u_temperature)");
    const iPresetLoop = src.indexOf("applyPresetOp(color");

    // spatial ops first
    expect(iClarity).toBeGreaterThan(-1);
    expect(iSharp).toBeGreaterThan(iClarity);
    // adjustments after spatial
    expect(iBrightness).toBeGreaterThan(iSharp);
    // canonical: brightness -> saturation -> contrast; temperature is last adj
    expect(iContrast).toBeGreaterThan(iBrightness);
    expect(iTemp).toBeGreaterThan(iContrast);
    // presets applied last
    expect(iPresetLoop).toBeGreaterThan(iTemp);
    // single trailing clamp after everything
    expect(src.indexOf("clamp(color, 0.0, 1.0)")).toBeGreaterThan(iPresetLoop);
  });
});
