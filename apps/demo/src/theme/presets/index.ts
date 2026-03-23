import type { ThemePresetValues } from "@creative-editor/image-editor";
import { amberMinimalDark, amberMinimalLight } from "./amber-minimal";
import { amethystHazeDark, amethystHazeLight } from "./amethyst-haze";
import { neutralDark, neutralLight } from "./neutral";
import { slateDark, slateLight } from "./slate";
import { stoneDark, stoneLight } from "./stone";
import { zincDark, zincLight } from "./zinc";

/**
 * Extra theme presets used in the demo to showcase theming capabilities.
 * Customers can use these as examples for building their own presets.
 */
export const demoPresets: Record<string, ThemePresetValues> = {
  "zinc-dark": zincDark,
  "zinc-light": zincLight,
  "slate-dark": slateDark,
  "slate-light": slateLight,
  "neutral-dark": neutralDark,
  "neutral-light": neutralLight,
  "stone-dark": stoneDark,
  "stone-light": stoneLight,
  "amber-minimal-dark": amberMinimalDark,
  "amber-minimal-light": amberMinimalLight,
  "amethyst-haze-dark": amethystHazeDark,
  "amethyst-haze-light": amethystHazeLight,
};
