import React, { useMemo } from 'react';
import type { ThemeConfig, ThemeColorKey } from '../config/config.types';
import { themePresets, type ThemePresetValues } from './presets';

interface ThemeProviderProps {
  theme?: ThemeConfig;
  children: React.ReactNode;
}

function buildCssVariables(theme: ThemeConfig): Record<string, string> {
  const preset = theme.preset ?? 'zinc-dark';
  const base: ThemePresetValues =
    preset === 'custom'
      ? themePresets['zinc-dark'] // Fallback to a default preset if 'custom' is selected without colors
      : themePresets[preset] ?? themePresets['zinc-dark'];

  const vars: Record<string, string> = {};

  // Apply base preset colors
  for (const [key, value] of Object.entries(base)) {
    vars[`--${key}`] = value;
  }

  // Override with user-provided colors
  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors) as [ThemeColorKey, string][]) {
      if (value !== undefined) {
        vars[`--${key}`] = value;
      }
    }
  }

  // Border radius
  if (theme.borderRadius) {
    vars['--radius'] = theme.borderRadius;
  } else {
    vars['--radius'] = '0.5rem';
  }

  return vars;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme = {}, children }) => {
  const style = useMemo(() => {
    const vars = buildCssVariables(theme);
    const fontFamily = theme.fontFamily ?? 'Inter, system-ui, sans-serif';
    return { ...vars, fontFamily } as React.CSSProperties;
  }, [theme]);

  return (
    <div style={style} className="ie-theme">
      {children}
    </div>
  );
};
