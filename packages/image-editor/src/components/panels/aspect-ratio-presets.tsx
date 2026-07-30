import type React from "react";
import type { CropPresetId } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { focusRing } from "../ui/styles";
import { AspectRatioIcon, type AspectRatioIconVariant } from "./aspect-ratio-icon";

const presets: {
  id: CropPresetId;
  label: string;
  variant?: AspectRatioIconVariant;
  ratio?: number;
}[] = [
  { id: "free", label: "Free", variant: "free" },
  { id: "original", label: "Original", variant: "original" },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

interface AspectRatioPresetsProps {
  activePreset: CropPresetId;
  ariaLabel: string;
  onSelect: (preset: CropPresetId) => void;
  /**
   * Optional whitelist of preset ids to show, in the given order. When omitted,
   * every built-in preset renders.
   */
  presetIds?: CropPresetId[];
}

export const AspectRatioPresets: React.FC<AspectRatioPresetsProps> = (props) => {
  const { activePreset, ariaLabel, onSelect, presetIds } = props;

  const visiblePresets = presetIds
    ? presetIds.flatMap((id) => {
        const p = presets.find((preset) => preset.id === id);
        return p ? [p] : [];
      })
    : presets;

  return (
    <fieldset className="grid grid-cols-2 gap-1.5 @3xl/editor:grid-cols-3" aria-label={ariaLabel}>
      {visiblePresets.map((preset) => (
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
              variant={preset.variant}
              ratio={preset.ratio}
              className="h-6 w-6 @3xl/editor:h-7 @3xl/editor:w-7"
            />
          </div>
          <span className="mt-1 leading-tight">{preset.label}</span>
        </button>
      ))}
    </fieldset>
  );
};
