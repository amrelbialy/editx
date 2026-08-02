import { SelectField } from "../controls";
import { LOCALE_TRANSLATIONS } from "../locale-translations";
import { LOCALE_OPTIONS } from "../playground.constants";
import type { SectionProps } from "../playground.types";

export function LocaleSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const isSample = config.locale in LOCALE_TRANSLATIONS;

  return (
    <div className="flex flex-col gap-1.5">
      <SelectField
        label="Locale"
        value={config.locale}
        options={LOCALE_OPTIONS}
        onChange={(v) => onConfigChange("locale", v)}
      />
      <p className="text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        {isSample
          ? "Applies sample translations (toolbar + top bar) via config.translations. Panels stay English — override more keys to translate them."
          : "config.locale only labels the active locale. Real localization comes from config.translations / translateFn."}
      </p>
    </div>
  );
}
