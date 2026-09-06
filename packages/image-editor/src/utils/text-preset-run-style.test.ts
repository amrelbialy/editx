import { describe, expect, it } from "vitest";
import { convertTextPresetRunStyle, convertValidTextRunOverrides } from "./text-preset-run-style";

describe("convertTextPresetRunStyle", () => {
  it("scales font and geometry, resolves padding, and leaves opacity unscaled", () => {
    expect(
      convertTextPresetRunStyle(
        {
          fontSizeScale: 2,
          letterSpacing: 4,
          textStrokeWidth: 2,
          textShadowBlur: 10,
          textShadowOffsetX: 6,
          textShadowOffsetY: -4,
          backgroundCornerRadius: 8,
          backgroundPadding: { top: 2, left: 6 },
          backgroundOpacity: 0.4,
        },
        24,
        0.5,
      ),
    ).toEqual({
      fontSize: 24,
      letterSpacing: 2,
      textStrokeWidth: 1,
      textShadowBlur: 5,
      textShadowOffsetX: 3,
      textShadowOffsetY: -2,
      backgroundCornerRadius: 4,
      backgroundPadding: { top: 1, right: 0, bottom: 0, left: 3 },
      backgroundOpacity: 0.4,
    });
  });

  it("preserves null clears and applies fill/gradient precedence", () => {
    expect(convertTextPresetRunStyle({ fill: "#fff" }, 24, 1)).toEqual({
      fill: "#fff",
      fillGradient: null,
    });
    const gradient = { type: "linear" as const, stops: [{ offset: 0, color: "#f00" }] };
    expect(convertTextPresetRunStyle({ fill: "#fff", fillGradient: gradient }, 24, 1)).toEqual({
      fill: "#fff",
      fillGradient: gradient,
    });
    expect(convertTextPresetRunStyle({ fill: null, backgroundColor: null }, 24, 1)).toEqual({
      fill: null,
      fillGradient: null,
      backgroundColor: null,
    });
    expect(
      convertTextPresetRunStyle(
        { fillGradient: null, backgroundCornerRadius: null, backgroundPadding: null },
        24,
        0.5,
      ),
    ).toEqual({ fillGradient: null, backgroundCornerRadius: null, backgroundPadding: null });
  });
});

describe("convertValidTextRunOverrides", () => {
  it("keeps one-character, disjoint, and overlapping ranges in authored order", () => {
    const text = "A😀BC";
    const result = convertValidTextRunOverrides(
      text,
      [
        { start: 3, end: 4, style: { fill: "#0f0" } },
        { start: 0, end: 1, style: { fontWeight: "bold" } },
        { start: 3, end: 5, style: { textDecoration: "underline" } },
        { start: 1, end: 3, style: { fontStyle: "italic" } },
      ],
      24,
      1,
    );

    expect(result).toEqual([
      { start: 3, end: 4, style: { fill: "#0f0", fillGradient: null } },
      { start: 0, end: 1, style: { fontWeight: "bold" } },
      { start: 3, end: 5, style: { textDecoration: "underline" } },
      { start: 1, end: 3, style: { fontStyle: "italic" } },
    ]);
  });

  it("skips invalid, out-of-bounds, non-integer, and surrogate-bisecting ranges", () => {
    const invalidRanges = [
      [-1, 1],
      [0, 6],
      [2, 2],
      [4, 3],
      [0.5, 1],
      [1, 2],
      [2, 3],
    ];
    const overrides = invalidRanges.map(([start, end]) => ({
      start,
      end,
      style: { fill: "#000" },
    }));

    expect(convertValidTextRunOverrides("A😀BC", overrides, 24, 1)).toEqual([]);
  });
});
