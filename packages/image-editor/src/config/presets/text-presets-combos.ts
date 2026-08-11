import type { TextPreset } from "../config.types";
import { boxedCombos } from "./text-presets-combos-boxed";
import { editorialCombos } from "./text-presets-combos-editorial";
import { promoCombos } from "./text-presets-combos-promo";

/** Multi-block "Text Combinations" presets (grouped on insertion). */
export const combinations: TextPreset[] = [...editorialCombos, ...promoCombos, ...boxedCombos];
