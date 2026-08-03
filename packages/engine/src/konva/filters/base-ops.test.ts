/**
 * @vitest-environment node
 *
 * Numeric verification of the canonical normalized filter primitives against
 * hand-computed values. These formulas are the shared source of truth with the
 * WebGL shader, so the expectations here are the contract both paths honour.
 */
import { describe, expect, it } from "vitest";
import {
  opBlacks,
  opBlackWhite,
  opBrightness,
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
  opSolarize,
  opTemperature,
  opWhites,
} from "./base-ops";

/** Build a single-pixel RGBA Float32 buffer (alpha defaults to 1). */
function px(r: number, g: number, b: number, a = 1): Float32Array {
  return Float32Array.from([r, g, b, a]);
}

/** Assert a single pixel's RGB channels match expected values (float tol). */
function expectRgb(buf: Float32Array, r: number, g: number, b: number): void {
  expect(buf[0]).toBeCloseTo(r, 5);
  expect(buf[1]).toBeCloseTo(g, 5);
  expect(buf[2]).toBeCloseTo(b, 5);
}

describe("base-ops primitives", () => {
  it("opBrightness adds a constant offset to each channel", () => {
    const buf = px(0.5, 0.2, 0.9);
    opBrightness(buf, 0.2);
    expectRgb(buf, 0.7, 0.4, 1.1);
    // alpha untouched
    expect(buf[3]).toBe(1);
  });

  it("opContrast uses the (1+v)^2 curve about 0.5", () => {
    const buf = px(0.75, 0.5, 0);
    opContrast(buf, 1); // f = 4
    expectRgb(buf, 1.5, 0.5, -1.5); // no clamping in the primitive
  });

  it("opContrast with negative v shrinks toward 0.5", () => {
    const buf = px(1, 0, 0.5);
    opContrast(buf, -0.5); // f = 0.25
    expectRgb(buf, 0.5 * 0.25 + 0.5, -0.5 * 0.25 + 0.5, 0.5);
  });

  it("opSaturation is a linear luma mix with 0.2989/0.587/0.114 weights", () => {
    const buf = px(1, 0, 0);
    const luma = 0.2989;
    opSaturation(buf, 1); // m = 2
    expectRgb(buf, -luma * 1 + 1 * 2, -luma * 1 + 0, -luma * 1 + 0);
  });

  it("opSaturation is near-identity on neutral gray (weights sum ~0.9999)", () => {
    const buf = px(0.4, 0.4, 0.4);
    const luma = (0.2989 + 0.587 + 0.114) * 0.4; // weights sum to 0.9999, not 1
    const expected = -luma * 0.7 + 0.4 * 1.7;
    opSaturation(buf, 0.7);
    expectRgb(buf, expected, expected, expected);
    // ...and only ~0.00003 off true gray, i.e. visually unchanged
    expect(buf[0]).toBeCloseTo(0.4, 3);
  });

  it("opGamma applies c^(1/(1+v)) with a non-negative base", () => {
    const buf = px(0.5, 0, -0.2);
    opGamma(buf, 1); // correction 0.5 => sqrt
    expectRgb(buf, Math.sqrt(0.5), 0, 0); // negative base clamped to 0 first
  });

  it("opExposure multiplies by 2^v", () => {
    const buf = px(0.5, 0.25, 0.1);
    opExposure(buf, 1);
    expectRgb(buf, 1, 0.5, 0.2);
  });

  it("opExposure with negative v darkens", () => {
    const buf = px(0.8, 0.4, 0.2);
    opExposure(buf, -1);
    expectRgb(buf, 0.4, 0.2, 0.1);
  });

  it("opTemperature warms red and cools blue by v*40/255", () => {
    const buf = px(0.5, 0.5, 0.5);
    const shift = 40 / 255;
    opTemperature(buf, 1);
    expectRgb(buf, 0.5 + shift, 0.5, 0.5 - shift);
  });

  it("opHighlightsShadows lifts bright pixels via the highlight weight", () => {
    const buf = px(0.75, 0.75, 0.75); // lum 0.75 -> hWeight 0.5, sWeight 0
    const adj = ((1 * 128) / 255) * 0.5;
    opHighlightsShadows(buf, 1, 0);
    expectRgb(buf, 0.75 + adj, 0.75 + adj, 0.75 + adj);
  });

  it("opHighlightsShadows lifts dark pixels via the shadow weight", () => {
    const buf = px(0.25, 0.25, 0.25); // lum 0.25 -> sWeight 0.5, hWeight 0
    const adj = ((1 * 128) / 255) * 0.5;
    opHighlightsShadows(buf, 0, 1);
    expectRgb(buf, 0.25 + adj, 0.25 + adj, 0.25 + adj);
  });

  it("opBlacks shifts shadows weighted toward black, pivot at 128/255", () => {
    const buf = px(0, 128 / 255, 1);
    const shift = 64 / 255;
    opBlacks(buf, 1);
    // value 0 -> weight 1; value at pivot -> weight 0; value above pivot -> 0
    expectRgb(buf, 0 + shift, 128 / 255, 1);
  });

  it("opWhites shifts highlights weighted toward white, lo at 128/255", () => {
    const buf = px(1, 128 / 255, 0);
    const shift = 64 / 255;
    opWhites(buf, 1);
    // value 1 -> weight 1; value at lo -> weight 0; value below lo -> 0
    expectRgb(buf, 1 + shift, 128 / 255, 0);
  });

  it("opSepia applies the canonical sepia matrix at amount 1", () => {
    const buf = px(0.5, 0.5, 0.5);
    opSepia(buf, 1);
    expectRgb(buf, 0.5 * 1.351, 0.5 * 1.203, 0.5 * 0.937);
  });

  it("opSepia at amount 0 is identity", () => {
    const buf = px(0.3, 0.6, 0.9);
    opSepia(buf, 0);
    expectRgb(buf, 0.3, 0.6, 0.9);
  });

  it("opGrayscale uses Rec.709 luma weights", () => {
    const buf = px(0, 1, 0);
    opGrayscale(buf);
    expectRgb(buf, 0.7152, 0.7152, 0.7152);
  });

  it("opInvert flips each channel about 1", () => {
    const buf = px(0.2, 0.5, 0.9);
    opInvert(buf);
    expectRgb(buf, 0.8, 0.5, 0.1);
  });

  it("opSolarize inverts at exactly 0.5 (>= boundary, matches GLSL step)", () => {
    const buf = px(0.5, 0.75, 0.25);
    opSolarize(buf);
    // 0.5 -> 1-0.5 = 0.5 (branch taken); 0.75 -> 0.25; 0.25 stays 0.25
    expectRgb(buf, 0.5, 0.25, 0.25);
  });

  it("opBlackWhite thresholds the channel average", () => {
    const bright = px(0.6, 0.6, 0.6);
    const dark = px(0.4, 0.4, 0.4);
    const atThreshold = px(0.5, 0.5, 0.5);
    opBlackWhite(bright, 0.5);
    opBlackWhite(dark, 0.5);
    opBlackWhite(atThreshold, 0.5); // avg == threshold -> not > -> 0
    expectRgb(bright, 1, 1, 1);
    expectRgb(dark, 0, 0, 0);
    expectRgb(atThreshold, 0, 0, 0);
  });

  it("opRgbMul scales each channel independently", () => {
    const buf = px(0.4, 0.5, 0.6);
    opRgbMul(buf, [1.1, 0.9, 2]);
    expectRgb(buf, 0.44, 0.45, 1.2);
  });

  it("opColorFilter lerps toward the filter color by the blend amount", () => {
    const buf = px(0, 0, 0);
    opColorFilter(buf, [1, 0.5, 0.25, 0.5]); // out = buf*(1-a) + color*a
    expectRgb(buf, 0.5, 0.25, 0.125);
  });
});
