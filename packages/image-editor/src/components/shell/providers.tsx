import type React from "react";
import type { ImageEditorConfig } from "../../config/config.types";
import { ImageEditorProvider } from "../../config/config-context";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-provider";
import { TooltipProvider } from "../ui/tooltip";

interface ProvidersProps {
  config?: ImageEditorConfig;
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = (props) => {
  const { config, children } = props;

  return (
    <ImageEditorProvider config={config}>
      <ThemeProvider theme={config?.theme}>
        <I18nProvider locale={config?.locale} translations={config?.translations}>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ImageEditorProvider>
  );
};
