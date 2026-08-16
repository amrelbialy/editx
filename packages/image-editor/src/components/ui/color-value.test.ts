import { describe, expect, it } from "vitest";
import { getColorOpacity, toOpaqueHexColor, withColorOpacity } from "./color-value";

describe("toOpaqueHexColor", () => {
  it.each([
    ["#AbC", "#aabbcc"],
    ["#AbC8", "#aabbcc"],
    ["#A1B2C3", "#a1b2c3"],
    ["#A1B2C380", "#a1b2c3"],
    ["rgba(12, 34, 56, 0.25)", "#0c2238"],
    ["rgb(100%, 50%, 0%)", "#ff8000"],
    ["transparent", "#000000"],
  ])("normalizes %s to %s", (color, expected) => {
    expect(toOpaqueHexColor(color)).toBe(expected);
  });

  it("uses a deterministic fallback for malformed values", () => {
    expect(toOpaqueHexColor("not-a-color")).toBe("#000000");
  });
});

describe("color opacity", () => {
  it.each([
    ["#abc8", 8 / 15],
    ["#a1b2c380", 128 / 255],
    ["rgba(12, 34, 56, 0.25)", 0.25],
    ["rgba(12, 34, 56, 25%)", 0.25],
    ["transparent", 0],
    ["#a1b2c3", 1],
  ])("reads opacity from %s", (color, expected) => {
    expect(getColorOpacity(color)).toBeCloseTo(expected);
  });

  it("applies opacity to a normalized CSS color", () => {
    expect(withColorOpacity("#A1B2C3", 0.25)).toBe("rgba(161,178,195,0.25)");
    expect(withColorOpacity("rgba(12, 34, 56, 0.2)", 1)).toBe("#0c2238");
  });
});
