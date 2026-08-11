import type { ShapeType } from "@editx/engine";
import type { PresetGroup, ShapePreset, TextPreset, TextStylePreset } from "./config.types";

/** Category id used when legacy `text.presets` are mapped onto the gallery. */
export const LEGACY_TEXT_GROUP_ID = "legacy-text";
/** Category id used when legacy `shapes.presets` are mapped onto the gallery. */
export const LEGACY_SHAPE_GROUP_ID = "legacy-shapes";

export interface ResolveTextPresetsInput {
  builtIn: PresetGroup<TextPreset>[];
  presetGroups?: PresetGroup<TextPreset>[];
  additionalPresetGroups?: PresetGroup<TextPreset>[];
  legacyPresets?: TextStylePreset[];
}

export interface ResolveShapePresetsInput {
  builtIn: PresetGroup<ShapePreset>[];
  presetGroups?: PresetGroup<ShapePreset>[];
  additionalPresetGroups?: PresetGroup<ShapePreset>[];
  legacyPresets?: string[];
}

/** Polygon side counts for legacy named shape ids. */
const LEGACY_SHAPE_SIDES: Record<string, number> = { triangle: 3, pentagon: 5, hexagon: 6 };

function legacyTextToPreset(p: TextStylePreset): TextPreset {
  return {
    id: p.id,
    label: p.label,
    blocks: [
      {
        text: p.text ?? p.label,
        x: 0.325,
        y: 0.45,
        width: 0.35,
        height: 0.1,
        fontSizeScale: p.fontSizeScale ?? 1,
        fontWeight: p.fontWeight,
      },
    ],
    preview: { kind: "text", sample: p.label, style: { fontWeight: p.fontWeight } },
  };
}

function legacyShapeToPreset(id: string): ShapePreset {
  const sides = LEGACY_SHAPE_SIDES[id];
  const kind = (sides ? "polygon" : id) as ShapeType;
  return {
    id,
    label: id,
    shape: { kind, sides },
    fill: { kind: "color" },
    preview: { kind: "shape" },
  };
}

/** Append `additions`, merging presets into any category sharing an `id`. */
function appendGroups<T extends { id: string }>(
  base: PresetGroup<T>[],
  additions: PresetGroup<T>[],
): PresetGroup<T>[] {
  const result = base.map((g) => ({ ...g, presets: [...g.presets] }));
  for (const add of additions) {
    const existing = result.find((g) => g.id === add.id);
    if (existing) existing.presets.push(...add.presets);
    else result.push({ ...add, presets: [...add.presets] });
  }
  return result;
}

/** Drop groups/presets with empty or duplicate ids (defensive, first wins). */
function sanitizeGroups<T extends { id: string }>(groups: PresetGroup<T>[]): PresetGroup<T>[] {
  const seenGroups = new Set<string>();
  const out: PresetGroup<T>[] = [];
  for (const g of groups) {
    if (!g.id || seenGroups.has(g.id)) continue;
    seenGroups.add(g.id);
    const seen = new Set<string>();
    const presets: T[] = [];
    for (const p of g.presets) {
      if (!p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      presets.push(p);
    }
    out.push({ ...g, presets });
  }
  return out;
}

/**
 * Final text preset categories. `presetGroups` **replaces** the built-ins; else
 * legacy `presets` map to a single category; else the built-ins are the base.
 * `additionalPresetGroups` then appends (matching category `id` merges presets).
 */
export function resolveTextPresetGroups(input: ResolveTextPresetsInput): PresetGroup<TextPreset>[] {
  const { builtIn, presetGroups, additionalPresetGroups, legacyPresets } = input;
  let base: PresetGroup<TextPreset>[];
  if (presetGroups) base = presetGroups;
  else if (legacyPresets && legacyPresets.length > 0)
    base = [
      {
        id: LEGACY_TEXT_GROUP_ID,
        label: "Text",
        labelKey: "presets.text.legacy",
        presets: legacyPresets.map(legacyTextToPreset),
      },
    ];
  else base = builtIn;
  const merged = additionalPresetGroups ? appendGroups(base, additionalPresetGroups) : base;
  return sanitizeGroups(merged);
}

/** Final shape preset categories — same replace/legacy/append semantics as text. */
export function resolveShapePresetGroups(
  input: ResolveShapePresetsInput,
): PresetGroup<ShapePreset>[] {
  const { builtIn, presetGroups, additionalPresetGroups, legacyPresets } = input;
  let base: PresetGroup<ShapePreset>[];
  if (presetGroups) base = presetGroups;
  else if (legacyPresets && legacyPresets.length > 0)
    base = [
      {
        id: LEGACY_SHAPE_GROUP_ID,
        label: "Shapes",
        labelKey: "presets.shapes.legacy",
        presets: legacyPresets.map(legacyShapeToPreset),
      },
    ];
  else base = builtIn;
  const merged = additionalPresetGroups ? appendGroups(base, additionalPresetGroups) : base;
  return sanitizeGroups(merged);
}

/** Find a preset by id across all categories. */
export function findPresetById<T extends { id: string }>(
  groups: PresetGroup<T>[],
  id: string,
): T | undefined {
  for (const group of groups) {
    const found = group.presets.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}
