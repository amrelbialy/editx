import { CheckList, FieldLabel } from "../controls";
import { FILTER_PRESET_NAMES, FILTER_PRESET_OPTIONS } from "../playground.constants";
import type { SectionProps } from "../playground.types";

export function FilterSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const togglePreset = (name: string) => {
    const enabled = new Set(config.filterPresets);
    if (enabled.has(name)) enabled.delete(name);
    else enabled.add(name);
    // Preserve the canonical preset order rather than appending re-enabled names.
    const next = FILTER_PRESET_NAMES.filter((n) => enabled.has(n));
    onConfigChange("filterPresets", next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Filter presets</FieldLabel>
      <CheckList
        options={FILTER_PRESET_OPTIONS}
        selected={config.filterPresets}
        onToggle={togglePreset}
      />
    </div>
  );
}
