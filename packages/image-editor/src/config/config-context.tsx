import React, { createContext, useContext, useMemo } from 'react';
import type { ImageEditorConfig, ImageEditorToolId } from './config.types';
import { defaultConfig } from './default-config';
import { deepMerge } from '../utils/deep-merge';

interface ConfigContextValue {
  config: ImageEditorConfig & { tools: ImageEditorToolId[] };
}

const ConfigContext = createContext<ConfigContextValue>({
  config: defaultConfig as ImageEditorConfig & { tools: ImageEditorToolId[] },
});

interface ImageEditorProviderProps {
  config?: ImageEditorConfig;
  children: React.ReactNode;
}

export const ImageEditorProvider: React.FC<ImageEditorProviderProps> = ({
  config: userConfig,
  children,
}) => {
  const value = useMemo<ConfigContextValue>(() => {
    const merged = userConfig
      ? deepMerge(defaultConfig as unknown as Record<string, unknown>, userConfig as unknown as Record<string, unknown>)
      : defaultConfig;
    return { config: merged as ImageEditorConfig & { tools: ImageEditorToolId[] } };
  }, [userConfig]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export function useConfig(): ImageEditorConfig & { tools: ImageEditorToolId[] } {
  return useContext(ConfigContext).config;
}
