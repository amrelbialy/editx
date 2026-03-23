import type React from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import { en } from "./translations/en";

interface I18nContextValue {
  locale: string;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key: string, fallback?: string) => fallback ?? key,
});

interface I18nProviderProps {
  locale?: string;
  translations?: Record<string, string>;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  locale = "en",
  translations: userTranslations,
  children,
}) => {
  const merged = useMemo(() => {
    if (!userTranslations) return en;
    return { ...en, ...userTranslations };
  }, [userTranslations]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return merged[key] ?? fallback ?? key;
    },
    [merged],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation() {
  return useContext(I18nContext);
}
