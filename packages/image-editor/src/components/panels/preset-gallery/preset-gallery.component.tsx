import { useMemo, useState } from "react";
import type { PresetGroup } from "../../../config/config.types";
import { usePresetSearch } from "../../../hooks/use-preset-search";
import { useTranslation } from "../../../i18n/i18n-context";
import type { TranslationKey } from "../../../i18n/translations/en";
import { SearchInput } from "../../ui";
import type { GalleryPreset } from "./preset-category-row.component";
import { PresetCategoryRow } from "./preset-category-row.component";

interface PresetGalleryProps<T extends GalleryPreset> {
  /** Resolved preset categories (built-in / config / legacy already merged). */
  groups: PresetGroup<T>[];
  /** Insert the preset with this id. */
  onSelect: (id: string) => void;
}

/**
 * Searchable, categorized preset gallery. Translates category labels, filters
 * via {@link usePresetSearch}, renders a row per non-empty category, and shows
 * an empty state when nothing matches.
 */
export const PresetGallery = <T extends GalleryPreset>(props: PresetGalleryProps<T>) => {
  const { groups, onSelect } = props;

  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const translatedGroups = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        label: g.labelKey ? t(g.labelKey as TranslationKey, g.label) : g.label,
      })),
    [groups, t],
  );

  const { groups: filtered, hasResults } = usePresetSearch(translatedGroups, query);

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("gallery.search")}
        ariaLabel={t("gallery.search")}
        clearLabel={t("gallery.clear")}
      />

      {hasResults ? (
        <div className="flex flex-col gap-4">
          {filtered.map((group) => (
            <PresetCategoryRow
              key={group.id}
              label={group.label}
              presets={group.presets}
              expanded={expandedGroupId === group.id}
              onToggleExpand={() =>
                setExpandedGroupId((current) => (current === group.id ? null : group.id))
              }
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-fluid text-muted-foreground">
          {t("gallery.noResults")}
        </p>
      )}
    </div>
  );
};
