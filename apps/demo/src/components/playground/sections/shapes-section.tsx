import { CheckList, ColorField, FieldLabel, RangeSlider, Segmented } from "../controls";
import { SHAPE_PRESET_IDS, SHAPE_PRESET_OPTIONS } from "../playground.constants";
import type { SectionProps } from "../playground.types";

const FILL_OPTIONS = [
  { label: "Filled", value: "filled" },
  { label: "Outlined", value: "outlined" },
] as const;

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ShapesSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const togglePreset = (id: string) => {
    const enabled = new Set(config.shapesPresets);
    if (enabled.has(id)) enabled.delete(id);
    else enabled.add(id);
    // Preserve the canonical shape order rather than appending re-enabled ids.
    const next = SHAPE_PRESET_IDS.filter((s) => enabled.has(s));
    onConfigChange("shapesPresets", next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Shape presets</FieldLabel>
        <CheckList
          options={SHAPE_PRESET_OPTIONS}
          selected={config.shapesPresets}
          onToggle={togglePreset}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Default fill mode</FieldLabel>
        <Segmented
          value={config.shapesDefaultFillMode}
          options={FILL_OPTIONS}
          onChange={(v) => onConfigChange("shapesDefaultFillMode", v)}
        />
      </div>
      <ColorField
        label="Default color"
        value={config.shapesDefaultColor}
        onChange={(v) => onConfigChange("shapesDefaultColor", v)}
      />
      <ColorField
        label="Default stroke color"
        value={config.shapesDefaultStrokeColor}
        onChange={(v) => onConfigChange("shapesDefaultStrokeColor", v)}
      />
      <RangeSlider
        label="Default stroke width"
        value={config.shapesDefaultStrokeWidth}
        min={0}
        max={20}
        step={0.5}
        format={(v) => (v === 0 ? "Auto" : v.toFixed(1))}
        onChange={(v) => onConfigChange("shapesDefaultStrokeWidth", v)}
      />
      <RangeSlider
        label="Default opacity"
        value={config.shapesDefaultOpacity}
        min={0}
        max={1}
        step={0.05}
        format={pct}
        onChange={(v) => onConfigChange("shapesDefaultOpacity", v)}
      />
      <RangeSlider
        label="Default corner radius"
        value={config.shapesDefaultCornerRadius}
        min={0}
        max={200}
        step={1}
        format={(v) => `${v}px`}
        onChange={(v) => onConfigChange("shapesDefaultCornerRadius", v)}
      />
      <RangeSlider
        label="Default size"
        value={config.shapesDefaultSize}
        min={0.05}
        max={1}
        step={0.05}
        format={pct}
        onChange={(v) => onConfigChange("shapesDefaultSize", v)}
      />
    </div>
  );
}
