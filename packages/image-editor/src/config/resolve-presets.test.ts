import { describe, expect, it } from "vitest";
import type { PresetGroup, ShapePreset, TextPreset } from "./config.types";
import {
  findPresetById,
  LEGACY_SHAPE_GROUP_ID,
  LEGACY_TEXT_GROUP_ID,
  resolveShapePresetGroups,
  resolveTextPresetGroups,
} from "./resolve-presets";

function textPreset(id: string): TextPreset {
  return {
    id,
    label: id,
    blocks: [{ text: id, x: 0, y: 0, width: 0.5, height: 0.1 }],
    preview: { kind: "text", sample: id },
  };
}

function textGroup(id: string, presetIds: string[]): PresetGroup<TextPreset> {
  return { id, label: id, presets: presetIds.map(textPreset) };
}

const builtInText: PresetGroup<TextPreset>[] = [textGroup("plain", ["title", "body"])];

function shapePreset(id: string): ShapePreset {
  return {
    id,
    label: id,
    shape: { kind: "rect" },
    fill: { kind: "color" },
    preview: { kind: "shape" },
  };
}

const builtInShape: PresetGroup<ShapePreset>[] = [
  { id: "filled", label: "Filled", presets: [shapePreset("filled-rect")] },
];

describe("resolveTextPresetGroups", () => {
  it("presetGroups REPLACES built-ins", () => {
    const result = resolveTextPresetGroups({
      builtIn: builtInText,
      presetGroups: [textGroup("custom", ["a"])],
    });
    expect(result.map((g) => g.id)).toEqual(["custom"]);
  });

  it("uses built-ins when nothing overrides", () => {
    const result = resolveTextPresetGroups({ builtIn: builtInText });
    expect(result.map((g) => g.id)).toEqual(["plain"]);
  });

  it("additionalPresetGroups APPENDS a new category", () => {
    const result = resolveTextPresetGroups({
      builtIn: builtInText,
      additionalPresetGroups: [textGroup("extra", ["x"])],
    });
    expect(result.map((g) => g.id)).toEqual(["plain", "extra"]);
  });

  it("additionalPresetGroups with a matching id MERGES presets", () => {
    const result = resolveTextPresetGroups({
      builtIn: builtInText,
      additionalPresetGroups: [textGroup("plain", ["subtitle"])],
    });
    expect(result).toHaveLength(1);
    expect(result[0].presets.map((p) => p.id)).toEqual(["title", "body", "subtitle"]);
  });

  it("maps legacy text.presets to a single category", () => {
    const result = resolveTextPresetGroups({
      builtIn: builtInText,
      legacyPresets: [
        { id: "title", label: "Title", text: "Title", fontSizeScale: 3, fontWeight: "bold" },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(LEGACY_TEXT_GROUP_ID);
    expect(result[0].presets[0].blocks[0].text).toBe("Title");
  });

  it("prefers presetGroups over legacy presets", () => {
    const result = resolveTextPresetGroups({
      builtIn: builtInText,
      presetGroups: [textGroup("custom", ["a"])],
      legacyPresets: [{ id: "title", label: "Title" }],
    });
    expect(result.map((g) => g.id)).toEqual(["custom"]);
  });

  it("skips presets with empty or duplicate ids", () => {
    const result = resolveTextPresetGroups({
      builtIn: [
        {
          id: "g",
          label: "g",
          presets: [textPreset("a"), textPreset(""), textPreset("a"), textPreset("b")],
        },
      ],
    });
    expect(result[0].presets.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("skips groups with empty or duplicate ids", () => {
    const result = resolveTextPresetGroups({
      builtIn: [textGroup("g", ["a"]), textGroup("", ["b"]), textGroup("g", ["c"])],
    });
    expect(result.map((g) => g.id)).toEqual(["g"]);
  });
});

describe("resolveShapePresetGroups", () => {
  it("presetGroups REPLACES built-ins", () => {
    const result = resolveShapePresetGroups({
      builtIn: builtInShape,
      presetGroups: [{ id: "mine", label: "Mine", presets: [shapePreset("m")] }],
    });
    expect(result.map((g) => g.id)).toEqual(["mine"]);
  });

  it("maps legacy shapes.presets to a single category, expanding named polygons", () => {
    const result = resolveShapePresetGroups({
      builtIn: builtInShape,
      legacyPresets: ["rect", "triangle", "star"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(LEGACY_SHAPE_GROUP_ID);
    const triangle = result[0].presets.find((p) => p.id === "triangle");
    expect(triangle?.shape.kind).toBe("polygon");
    expect(triangle?.shape.sides).toBe(3);
    expect(triangle?.fill).toEqual({ kind: "color", color: "#3b82f6" });
  });

  it("uses the configured default color for legacy shape semantics", () => {
    const result = resolveShapePresetGroups({
      builtIn: builtInShape,
      legacyPresets: ["ellipse"],
      defaultColor: "#be123c",
    });

    expect(result[0].presets[0].fill).toEqual({ kind: "color", color: "#be123c" });
  });

  it("normalizes missing solid colors in custom semantic presets", () => {
    const result = resolveShapePresetGroups({
      builtIn: builtInShape,
      presetGroups: [{ id: "mine", label: "Mine", presets: [shapePreset("custom")] }],
      defaultColor: "#0f766e",
    });

    expect(result[0].presets[0].fill).toEqual({ kind: "color", color: "#0f766e" });
  });

  it("appends a new shape category", () => {
    const result = resolveShapePresetGroups({
      builtIn: builtInShape,
      additionalPresetGroups: [{ id: "brand", label: "Brand", presets: [shapePreset("b")] }],
    });
    expect(result.map((g) => g.id)).toEqual(["filled", "brand"]);
  });
});

describe("findPresetById", () => {
  it("finds a preset across categories", () => {
    const groups = [textGroup("a", ["one"]), textGroup("b", ["two"])];
    expect(findPresetById(groups, "two")?.id).toBe("two");
    expect(findPresetById(groups, "missing")).toBeUndefined();
  });
});
