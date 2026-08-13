import type { TextPreset } from "../config.types";
import { boxedCombos } from "./text-presets-combos-boxed";
import { brandCombos } from "./text-presets-combos-brand";
import { campaignCombos } from "./text-presets-combos-campaign";
import { editorialCombos } from "./text-presets-combos-editorial";
import { promoCombos } from "./text-presets-combos-promo";

const allCombinations = [
  ...editorialCombos,
  ...promoCombos,
  ...boxedCombos,
  ...brandCombos,
  ...campaignCombos,
];
const featuredIds = ["text-box", "postcard", "promo-code", "thanks-plus", "quote"] as const;

function requireCombination(id: (typeof featuredIds)[number]): TextPreset {
  const preset = allCombinations.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Missing featured text combination: ${id}`);
  return preset;
}

/** Multi-block "Text Combinations" presets (grouped on insertion). */
export const combinations: TextPreset[] = [
  ...featuredIds.map(requireCombination),
  ...allCombinations.filter((preset) => !featuredIds.includes(preset.id as never)),
];
