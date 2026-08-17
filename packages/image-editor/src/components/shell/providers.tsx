import type React from "react";
import type { ImageEditorConfig } from "../../config/config.types";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-provider";
import { PresetThumbnailProvider } from "../preset-thumbnail-provider";
import { TooltipProvider } from "../ui/tooltip";

interface ProvidersProps {
  config?: ImageEditorConfig;
  children: React.ReactNode;
}

const DEFAULT_CONFIG: ImageEditorConfig = {};

export const Providers: React.FC<ProvidersProps> = (props) => {
  const { config, children } = props;

  return (
    <ImageEditorProvider config={config ?? DEFAULT_CONFIG}>
      <ThemeProvider theme={config?.theme}>
        <I18nProvider
          locale={config?.locale}
          translations={config?.translations}
          translateFn={config?.translateFn}
        >
          <TooltipProvider>
            <PresetThumbnailProvider>{children}</PresetThumbnailProvider>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ImageEditorProvider>
  );
};
