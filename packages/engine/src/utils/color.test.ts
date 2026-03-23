import { describe, expect, it } from "vitest";
import { colorToHex, hexToColor } from "./color";

describe("colorToHex", () => {
  it("converts pure red to hex", () => {
    expect(colorToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe("#ff0000");
  });

  it("converts pure green to hex", () => {
    expect(colorToHex({ r: 0, g: 1, b: 0, a: 1 })).toBe("#00ff00");
  });

  it("converts pure blue to hex", () => {
    expect(colorToHex({ r: 0, g: 0, b: 1, a: 1 })).toBe("#0000ff");
  });

  it("converts white to hex", () => {
    expect(colorToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe("#ffffff");
  });

  it("converts black to hex", () => {
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe("#000000");
  });

  it("converts mid-gray correctly", () => {
    expect(colorToHex({ r: 0.5, g: 0.5, b: 0.5, a: 1 })).toBe("#808080");
  });

  it("returns rgba() when alpha < 1", () => {
    expect(colorToHex({ r: 1, g: 0, b: 0, a: 0.5 })).toBe("rgba(255,0,0,0.5)");
  });

  it("returns rgba() when alpha is 0", () => {
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 0 })).toBe("rgba(0,0,0,0)");
  });
});

describe("hexToColor", () => {
  it("parses #ff0000 to red", () => {
    expect(hexToColor("#ff0000")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("parses #00ff00 to green", () => {
    expect(hexToColor("#00ff00")).toEqual({ r: 0, g: 1, b: 0, a: 1 });
  });

  it("parses #0000ff to blue", () => {
    expect(hexToColor("#0000ff")).toEqual({ r: 0, g: 0, b: 1, a: 1 });
  });

  it("parses #ffffff to white", () => {
    expect(hexToColor("#ffffff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it("parses #000000 to black", () => {
    expect(hexToColor("#000000")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("always returns alpha = 1", () => {
    const c = hexToColor("#abcdef");
    expect(c.a).toBe(1);
  });

  it("round-trips with colorToHex for full-alpha colors", () => {
    const original = { r: 0.2, g: 0.4, b: 0.6, a: 1 };
    const hex = colorToHex(original);
    const result = hexToColor(hex);
    // Allow small rounding tolerance (0-255 quantization)
    expect(result.r).toBeCloseTo(original.r, 1);
    expect(result.g).toBeCloseTo(original.g, 1);
    expect(result.b).toBeCloseTo(original.b, 1);
  });
});
