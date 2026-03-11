export type { ThemeColorKey, ThemePresetValues } from './types';

export { zincDark, zincLight } from './zinc';
export { slateDark, slateLight } from './slate';
export { neutralDark, neutralLight } from './neutral';
export { stoneDark, stoneLight } from './stone';
export { amberMinimalDark, amberMinimalLight } from './amber-minimal';
export { amethystHazeDark, amethystHazeLight } from './amethyst-haze';

import { zincDark, zincLight } from './zinc';
import { slateDark, slateLight } from './slate';
import { neutralDark, neutralLight } from './neutral';
import { stoneDark, stoneLight } from './stone';
import { amberMinimalDark, amberMinimalLight } from './amber-minimal';
import { amethystHazeDark, amethystHazeLight } from './amethyst-haze';

export const themePresets = {
  'zinc-dark': zincDark,
  'slate-dark': slateDark,
  'neutral-dark': neutralDark,
  'stone-dark': stoneDark,
  'zinc-light': zincLight,
  'slate-light': slateLight,
  'neutral-light': neutralLight,
  'stone-light': stoneLight,
  'amber-minimal-dark': amberMinimalDark,
  'amber-minimal-light': amberMinimalLight,
  'amethyst-haze-dark': amethystHazeDark,
  'amethyst-haze-light': amethystHazeLight,
} as const;

export type BuiltInPreset = keyof typeof themePresets;
