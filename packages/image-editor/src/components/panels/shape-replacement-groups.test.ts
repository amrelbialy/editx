import { describe, expect, it } from "vitest";
import type { ShapePreset } from "../../config/config.types";
import { DEFAULT_SHAPE_PRESET_GROUPS } from "../../config/presets";
import { toShapeGeometry } from "../../config/shape-geometry-options";
import { createShapeReplacementGroups } from "./shape-replacement-groups";

function identity(preset: ShapePreset): string {
  const geometry = toShapeGeometry(preset.shape);
  if (geometry.type !== "path") return JSON.stringify(geometry);
  return JSON.stringify({ pathData: geometry.pathData, viewBox: geometry.viewBox });
}

describe("shape replacement groups", () => {
  it("removes styled duplicates and applies the selected block paint to every preview", () => {
    const paint = {
      fill: { kind: "color" as const, color: "#123456" },
      stroke: { color: "#abcdef", width: 7 },
    };
    const groups = createShapeReplacementGroups(DEFAULT_SHAPE_PRESET_GROUPS, paint);
    const presets = groups.flatMap((group) => group.presets);
    const identities = presets.map(identity);

    expect(groups.map(({ label }) => label)).toEqual(["Basic", "Abstract"]);
    expect(new Set(identities).size).toBe(identities.length);
    expect(presets.filter(({ label }) => label === "Heart")).toHaveLength(1);
    expect(presets.filter(({ label }) => label === "Rectangle")).toHaveLength(1);
    expect(presets.some(({ label }) => label === "Block Arrow")).toBe(true);
    expect(presets.some(({ label, shape }) => label === "Arrow" && shape.kind === "line")).toBe(
      true,
    );
    for (const preset of presets) {
      expect(preset.fill).toEqual(paint.fill);
      expect(preset.stroke).toEqual(paint.stroke);
    }
  });
});
