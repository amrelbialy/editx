import { describe, expect, it } from "vitest";
import { validateSvgPathData } from "./svg-path-validation";

describe("validateSvgPathData", () => {
  it("returns the input unchanged for allowlisted characters", () => {
    const d = "M0 0 L10 10 C1 2 3 4 5 6 A5 5 0 0 1 10 10 Z";
    expect(validateSvgPathData(d)).toBe(d);
  });

  it("accepts decimals, signs and exponents", () => {
    expect(validateSvgPathData("M1.5 -2.5 l+3 4e2 -1E-3")).toBe("M1.5 -2.5 l+3 4e2 -1E-3");
  });

  it("accepts an empty string", () => {
    expect(validateSvgPathData("")).toBe("");
  });

  it.each([
    "M0 0<script>",
    "M0 0 L10 10 url(#x)",
    "javascript:alert(1)",
    "M0 0#hash",
    "M0 0 (evil)",
    'M0 0 "x"',
  ])("throws on disallowed content: %s", (bad) => {
    expect(() => validateSvgPathData(bad)).toThrow("Invalid SVG path data");
  });
});
