import type React from "react";
import { useMemo } from "react";
import { useConfig } from "../../config/config-context";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../../config/presets";
import { resolveTextPreview } from "../../config/presets/derive-text-preview";
import { resolveTextPresetGroups } from "../../config/resolve-presets";
import type { TextPreset } from "../../hooks/use-text-tool";
import { PresetGallery } from "./preset-gallery";

export interface TextPanelProps {
  /** Legacy single-preset insertion (retained for API compatibility). */
  onAddText: (preset?: TextPreset) => void;
  /** Gallery insertion by preset id. */
  onAddTextPreset?: (id: string) => void;
}

/**
 * Thin wrapper: resolves the text preset catalog (built-in rich catalog by
 * default; consumer `presetGroups` / `additionalPresetGroups` / legacy
 * `presets` honoured) and delegates browsing + insertion to the gallery.
 */
export const TextPanel: React.FC<TextPanelProps> = (props) => {
  const { onAddText, onAddTextPreset } = props;

  const config = useConfig();

  const groups = useMemo(() => {
    const text = config.text ?? {};
    const resolved = resolveTextPresetGroups({
      builtIn: DEFAULT_TEXT_PRESET_GROUPS,
      presetGroups: text.presetGroups,
      additionalPresetGroups: text.additionalPresetGroups,
      legacyPresets: text.presets,
    });
    // Derive each thumbnail from the block's real style (consumer-supplied
    // `preview.style` is honoured) so previews track the inserted result.
    return resolved.map((group) => ({
      ...group,
      presets: group.presets.map((preset) => ({
        ...preset,
        preview: resolveTextPreview(preset),
      })),
    }));
  }, [config.text]);

  const handleSelect = onAddTextPreset ?? ((id: string) => onAddText(id));

  return <PresetGallery groups={groups} onSelect={handleSelect} />;
};
