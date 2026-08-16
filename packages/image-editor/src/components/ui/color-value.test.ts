import { describe, expect, it } from "vitest";
import { toOpaqueHexColor } from "./color-value";

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
