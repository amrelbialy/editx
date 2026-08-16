import { describe, expect, it } from "vitest";
import { DEFAULT_SHAPE_PRESET_GROUPS } from "./shape-presets";

function group(id: string) {
  const match = DEFAULT_SHAPE_PRESET_GROUPS.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing shape preset group: ${id}`);
  return match;
}

describe("built-in shape presets", () => {
  it("exposes five rich categories with the backward-compatible path group id", () => {
    expect(DEFAULT_SHAPE_PRESET_GROUPS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "filled", label: "Filled" },
      { id: "outline", label: "Outline" },
      { id: "gradient", label: "Gradient" },
      { id: "image", label: "Image" },
      { id: "path", label: "Abstract" },
    ]);
    expect(DEFAULT_SHAPE_PRESET_GROUPS.map(({ presets }) => presets.length)).toEqual([
      12, 12, 12, 12, 12,
    ]);
  });

  it("uses matching geometry for filled, outline, and gradient categories", () => {
    const geometry = (id: string) => group(id).presets.map(({ shape }) => shape);

    expect(geometry("outline")).toEqual(geometry("filled"));
    expect(geometry("gradient")).toEqual(geometry("filled"));
    expect(geometry("filled").length).toBeGreaterThanOrEqual(10);
  });

  it("authors every outline with transparent fill and a visible stroke", () => {
    for (const preset of group("outline").presets) {
      expect(preset.fill).toEqual({ kind: "color", color: "#00000000" });
      expect(preset.stroke?.width).toBeGreaterThan(0);
    }
  });

  it("provides at least ten abstract shapes with unique ids", () => {
    const presets = group("path").presets;
    expect(presets.length).toBeGreaterThanOrEqual(10);
    expect(new Set(presets.map(({ id }) => id)).size).toBe(presets.length);
  });
});
