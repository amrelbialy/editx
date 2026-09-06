import { useEffect, useMemo, useState } from "react";
import type { PresetGroup } from "../config/config.types";

/** Delay before a typed query takes effect, in ms. */
const DEBOUNCE_MS = 150;

interface PresetSearchResult<T> {
  /** Categories with at least one matching preset (empty categories dropped). */
  groups: PresetGroup<T>[];
  /** False when the (debounced) query matches nothing. */
  hasResults: boolean;
}

/**
 * Debounced, case-insensitive preset search. Matches a query against each
 * preset's `label` and its category `label`; a category-label match keeps all
 * of that category's presets. An empty query returns every group unchanged.
 */
export function usePresetSearch<T extends { id: string; label: string }>(
  groups: PresetGroup<T>[],
  query: string,
): PresetSearchResult<T> {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  return useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    if (!needle) return { groups, hasResults: groups.length > 0 };

    const filtered: PresetGroup<T>[] = [];
    for (const group of groups) {
      if (group.label.toLowerCase().includes(needle)) {
        filtered.push(group);
        continue;
      }
      const presets = group.presets.filter((p) => p.label.toLowerCase().includes(needle));
      if (presets.length > 0) filtered.push({ ...group, presets });
    }

    return { groups: filtered, hasResults: filtered.length > 0 };
  }, [groups, debounced]);
}
