/**
 * Filter preset registry — derived from the shared, data-driven
 * {@link PRESET_DEFS}. Both the CPU chain and the WebGL renderer use the same
 * ordered op lists, so preset output is identical across paths.
 */
import { createPresetFilter } from "../cpu-chain";
import { PRESET_DEFS, type PresetDef, type PresetOp } from "./preset-defs";

export interface FilterPresetInfo {
  /** Display label for the UI */
  label: string;
  /** Filter function to apply — mutates ImageData in-place */
  filter: (imageData: ImageData) => void;
  /** 'custom' = pixel-manipulation, 'konva' = built-in Konva filter */
  type: "custom" | "konva";
}

/**
 * All available filter presets, keyed by name.
 * Order here determines display order in the UI.
 */
export const FILTER_PRESETS: ReadonlyMap<string, FilterPresetInfo> = new Map(
  PRESET_DEFS.map((def) => [
    def.name,
    {
      label: def.label,
      filter: createPresetFilter(def.ops),
      type: def.konva ? "konva" : "custom",
    } satisfies FilterPresetInfo,
  ]),
);

const PRESET_DEF_BY_NAME: ReadonlyMap<string, PresetDef> = new Map(
  PRESET_DEFS.map((def) => [def.name, def]),
);

/** Get the filter function for a preset name, or undefined if not found. */
export function getFilterPreset(name: string): ((imageData: ImageData) => void) | undefined {
  return FILTER_PRESETS.get(name)?.filter;
}

/** Get the ordered op list for a preset name, or undefined if not found. */
export function getPresetOps(name: string): readonly PresetOp[] | undefined {
  return PRESET_DEF_BY_NAME.get(name)?.ops;
}

export type { PresetDef, PresetOp } from "./preset-defs";
