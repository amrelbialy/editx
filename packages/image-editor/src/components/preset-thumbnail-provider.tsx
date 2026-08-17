import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useConfig } from "../config/config-context";
import { PresetThumbnailRenderer, type RasterPreset } from "../services/preset-thumbnail-renderer";
import { getStaticPresetThumbnail } from "../services/preset-thumbnail-static";

interface PresetThumbnailContextValue {
  renderer: PresetThumbnailRenderer;
  resolveStatic: (preset: RasterPreset) => string | null;
}

const PresetThumbnailContext = createContext<PresetThumbnailContextValue | null>(null);

interface PresetThumbnailProviderProps {
  children: React.ReactNode;
}

export const PresetThumbnailProvider: React.FC<PresetThumbnailProviderProps> = (props) => {
  const { children } = props;
  const config = useConfig();

  const renderer = useMemo(() => new PresetThumbnailRenderer(config), [config]);
  const value = useMemo<PresetThumbnailContextValue>(
    () => ({ renderer, resolveStatic: (preset) => getStaticPresetThumbnail(preset, config) }),
    [config, renderer],
  );

  useEffect(() => () => renderer.dispose(), [renderer]);

  return (
    <PresetThumbnailContext.Provider value={value}>{children}</PresetThumbnailContext.Provider>
  );
};

interface PresetThumbnailState {
  url: string | null;
  failed: boolean;
}

export function usePresetThumbnail(preset: RasterPreset | null): PresetThumbnailState {
  const context = useContext(PresetThumbnailContext);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (!context || !preset) {
      setFailed(true);
      return () => undefined;
    }
    const staticUrl = context.resolveStatic(preset);
    if (staticUrl) {
      setUrl(staticUrl);
      return () => undefined;
    }
    context.renderer.render(preset).then(
      (nextUrl) => {
        if (active) setUrl(nextUrl);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [context, preset]);

  return { url, failed };
}
