import type { ThemePresetValues } from "@editx/image-editor";
import { demoPresets } from "../../../theme/presets";
import { ColorList, FieldLabel, SelectField } from "../controls";
import { BORDER_RADIUS_OPTIONS, FONT_FAMILY_OPTIONS } from "../playground.constants";
import type { SectionProps } from "../playground.types";
import { ThemeSwatch } from "../theme-swatch";

const BUILT_IN: Record<string, ThemePresetValues> = {
  dark: { background: "#09090b", foreground: "#fafafa", primary: "#7c3aed", card: "#18181b" },
  light: { background: "#ffffff", foreground: "#09090b", primary: "#7c3aed", card: "#ffffff" },
};

const ALL_PRESETS = ["dark", "light", ...Object.keys(demoPresets)];

export function ThemeSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto p-0.5">
        {ALL_PRESETS.map((name) => (
          <ThemeSwatch
            key={name}
            name={name}
            colors={BUILT_IN[name] ?? demoPresets[name] ?? {}}
            active={config.themePreset === name}
            onClick={() => onConfigChange("themePreset", name)}
          />
        ))}
      </div>

      <SelectField
        label="Border radius"
        value={config.borderRadius}
        options={BORDER_RADIUS_OPTIONS}
        onChange={(v) => onConfigChange("borderRadius", v)}
      />
      <SelectField
        label="Font family"
        value={config.fontFamily}
        options={FONT_FAMILY_OPTIONS}
        onChange={(v) => onConfigChange("fontFamily", v)}
      />

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Color palette</FieldLabel>
        <ColorList colors={config.colors} onChange={(colors) => onConfigChange("colors", colors)} />
      </div>
    </div>
  );
}
