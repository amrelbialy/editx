import { CheckList, FieldLabel, OptionRow, Toggle } from "../controls";
import { CROP_ASPECT_PRESET_IDS, CROP_RESIZE_GROUP_LABELS } from "../crop-presets";
import type { SectionProps } from "../playground.types";

const ASPECT_OPTIONS = CROP_ASPECT_PRESET_IDS.map((id) => ({ label: id, value: id }));
const RESIZE_OPTIONS = CROP_RESIZE_GROUP_LABELS.map((label) => ({ label, value: label }));

export function CropSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const toggleAspect = (id: string) => {
    const enabled = new Set(config.cropAspectPresets);
    if (enabled.has(id)) enabled.delete(id);
    else enabled.add(id);
    // Preserve the canonical preset order rather than appending re-enabled ids.
    const next = CROP_ASPECT_PRESET_IDS.filter((p) => enabled.has(p));
    onConfigChange("cropAspectPresets", next);
  };

  const toggleGroup = (label: string) => {
    const next = config.cropResizeGroups.includes(label)
      ? config.cropResizeGroups.filter((g) => g !== label)
      : [...config.cropResizeGroups, label];
    onConfigChange("cropResizeGroups", next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Aspect ratios</FieldLabel>
        <CheckList
          options={ASPECT_OPTIONS}
          selected={config.cropAspectPresets}
          onToggle={toggleAspect}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Resize groups</FieldLabel>
        <CheckList
          options={RESIZE_OPTIONS}
          selected={config.cropResizeGroups}
          onToggle={toggleGroup}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <OptionRow label="Allow custom ratio">
          <Toggle
            checked={config.cropAllowCustomRatio}
            onChange={(v) => onConfigChange("cropAllowCustomRatio", v)}
          />
        </OptionRow>
        <OptionRow label="Show rotate / flip">
          <Toggle
            checked={config.cropShowRotateFlip}
            onChange={(v) => onConfigChange("cropShowRotateFlip", v)}
          />
        </OptionRow>
      </div>
    </div>
  );
}
