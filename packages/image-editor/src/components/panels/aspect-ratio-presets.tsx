import type React from "react";
import type { AspectRatioPreset } from "../../config/config.types";
import type { CropPresetId } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { focusRing } from "../ui/styles";
import { AspectRatioIcon, type AspectRatioIconVariant } from "./aspect-ratio-icon";

interface AspectRatioPresetsProps {
  activePreset: CropPresetId;
  ariaLabel: string;
  onSelect: (preset: CropPresetId) => void;
  /** Full list of aspect-ratio presets to render (from config). */
  presets: AspectRatioPreset[];
  /**
   * Optional whitelist of preset ids to show, in the given order. When omitted,
   * every preset in `presets` renders in its original order.
   */
  presetIds?: string[];
}

/** Map a preset's ratio value to the icon variant + numeric ratio. */
function iconFor(ratio: AspectRatioPreset["ratio"]): {
  variant: AspectRatioIconVariant;
  ratio?: number;
} {
  if (ratio === "original") return { variant: "original" };
  if (ratio === "free" || ratio == null) return { variant: "free" };
  return { variant: "ratio", ratio };
}

export const AspectRatioPresets: React.FC<AspectRatioPresetsProps> = (props) => {
  const { activePreset, ariaLabel, onSelect, presets, presetIds } = props;

  const visiblePresets = presetIds
    ? presetIds.flatMap((id) => {
        const p = presets.find((preset) => preset.id === id);
        return p ? [p] : [];
      })
    : presets;

  return (
    <fieldset className="grid grid-cols-2 gap-1.5 @3xl/editor:grid-cols-3" aria-label={ariaLabel}>
      {visiblePresets.map((preset) => {
        const icon = iconFor(preset.ratio);
        return (
          <button
            type="button"
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            data-testid={`crop-preset-${preset.id}`}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-start rounded-md px-1.5 py-2.5 text-fluid transition-colors",
              focusRing,
              activePreset === preset.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <div className="flex h-7 items-center justify-center">
              <AspectRatioIcon
                variant={icon.variant}
                ratio={icon.ratio}
                className="h-6 w-6 @3xl/editor:h-7 @3xl/editor:w-7"
              />
            </div>
            <span className="mt-1 leading-tight">{preset.label}</span>
          </button>
        );
      })}
    </fieldset>
  );
};
