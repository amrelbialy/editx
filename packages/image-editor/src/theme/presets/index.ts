export type { ThemeColorKey, ThemePresetValues } from './types';

export { defaultDark, defaultLight } from './default';

import { defaultDark, defaultLight } from './default';

export const themePresets = {
  dark: defaultDark,
  light: defaultLight,
} as const;

export type BuiltInPreset = keyof typeof themePresets;
