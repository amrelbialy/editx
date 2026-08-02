import { ColorField, FieldLabel, NumberField, Segmented } from "../controls";
import type { SectionProps } from "../playground.types";

const STYLE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Italic", value: "italic" },
] as const;

const ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
] as const;

export function TextSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        These defaults apply to newly added text. Existing text keeps its own styling.
      </p>
      <NumberField
        label="Default font size"
        value={config.textDefaultFontSize}
        min={1}
        max={500}
        suffix="px"
        onChange={(v) => onConfigChange("textDefaultFontSize", v)}
      />
      <ColorField
        label="Default color"
        value={config.textDefaultColor}
        onChange={(v) => onConfigChange("textDefaultColor", v)}
      />

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Font style</FieldLabel>
        <Segmented
          value={config.textDefaultFontStyle}
          options={STYLE_OPTIONS}
          onChange={(v) => onConfigChange("textDefaultFontStyle", v)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Text align</FieldLabel>
        <Segmented
          value={config.textDefaultTextAlign}
          options={ALIGN_OPTIONS}
          onChange={(v) => onConfigChange("textDefaultTextAlign", v)}
        />
      </div>

      <NumberField
        label="Line height"
        value={config.textDefaultLineHeight}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(v) => onConfigChange("textDefaultLineHeight", v)}
      />
      <NumberField
        label="Letter spacing"
        value={config.textDefaultLetterSpacing}
        step={0.5}
        suffix="px"
        onChange={(v) => onConfigChange("textDefaultLetterSpacing", v)}
      />
      <NumberField
        label="Min font size"
        value={config.textMinFontSize}
        min={1}
        suffix="px"
        onChange={(v) => onConfigChange("textMinFontSize", v)}
      />
      <NumberField
        label="Max font size"
        value={config.textMaxFontSize}
        min={1}
        suffix="px"
        onChange={(v) => onConfigChange("textMaxFontSize", v)}
      />
    </div>
  );
}
