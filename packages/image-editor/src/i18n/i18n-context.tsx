import type React from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { TranslationKey } from "./translations/en";
import { en } from "./translations/en";

type TranslateFn = (key: TranslationKey, fallback?: string) => string;

interface I18nContextValue {
  locale: string;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key: string, fallback?: string) => fallback ?? key,
});

interface I18nProviderProps {
  locale?: string;
  translations?: Partial<Record<TranslationKey, string>> | Record<string, string>;
  /** When provided, called instead of the built-in dictionary lookup. */
  translateFn?: (key: string) => string;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  locale = "en",
  translations: userTranslations,
  translateFn,
  children,
}) => {
  const merged = useMemo(() => {
    if (!userTranslations) return en as Record<string, string>;
    return { ...(en as Record<string, string>), ...userTranslations };
  }, [userTranslations]);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      if (translateFn) return translateFn(key) || fallback || key;
      return merged[key] ?? fallback ?? key;
    },
    [merged, translateFn],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation() {
  return useContext(I18nContext);
}
