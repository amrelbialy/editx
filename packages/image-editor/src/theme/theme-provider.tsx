import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { PopoverContainerProvider } from "../components/ui/popover-container-context";
import type { ThemeConfig } from "../config/config.types";
import type { ThemeColorKey } from "./presets";
import { type ThemePresetValues, themePresets } from "./presets";

interface ThemeProviderProps {
  theme?: ThemeConfig;
  children: React.ReactNode;
}

function buildCssVariables(theme: ThemeConfig): Record<string, string> {
  const preset = theme.preset ?? "dark";
  const base: ThemePresetValues =
    preset === "custom"
      ? themePresets.dark
      : (themePresets[preset as keyof typeof themePresets] ?? themePresets.dark);

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
    vars["--radius"] = theme.borderRadius;
  } else {
    vars["--radius"] = "0.5rem";
  }

  return vars;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme = {}, children }) => {
  const _colorsJson = theme.colors ? JSON.stringify(theme.colors) : "";
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);
  const refCallback = useCallback((node: HTMLDivElement | null) => {
    setContainer(node ?? undefined);
  }, []);
  const style = useMemo(() => {
    const vars = buildCssVariables(theme);
    const fontFamily = theme.fontFamily ?? "Inter, system-ui, sans-serif";
    return { ...vars, fontFamily } as React.CSSProperties;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.preset, theme.borderRadius, theme.fontFamily, theme]);

  return (
    <div ref={refCallback} style={style} className="ie-theme">
      <PopoverContainerProvider value={container}>{children}</PopoverContainerProvider>
    </div>
  );
};
