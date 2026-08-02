import {
  CheckList,
  FieldLabel,
  OptionRow,
  RangeSlider,
  SelectField,
  TextField,
  Toggle,
} from "../controls";
import { EXPORT_FORMAT_OPTIONS, EXPORT_FORMATS } from "../playground.constants";
import type { ExportFormat, SectionProps } from "../playground.types";

export function ExportSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const toggleFormat = (format: string) => {
    const enabled = new Set(config.exportFormats);
    if (enabled.has(format as ExportFormat)) {
      if (enabled.size === 1) return; // keep at least one format available
      enabled.delete(format as ExportFormat);
    } else {
      enabled.add(format as ExportFormat);
    }
    const next = EXPORT_FORMATS.filter((f) => enabled.has(f));
    onConfigChange("exportFormats", next);
    // Keep the default format valid when it's removed from the whitelist.
    if (!next.includes(config.exportFormat)) onConfigChange("exportFormat", next[0]);
  };

  const defaultFormatOptions = EXPORT_FORMAT_OPTIONS.filter((o) =>
    config.exportFormats.includes(o.value),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Formats</FieldLabel>
        <CheckList
          options={EXPORT_FORMAT_OPTIONS}
          selected={config.exportFormats}
          onToggle={toggleFormat}
        />
      </div>
      <SelectField
        label="Default format"
        value={config.exportFormat}
        options={defaultFormatOptions}
        onChange={(v) => onConfigChange("exportFormat", v)}
      />
      <RangeSlider
        label="Quality"
        value={Math.round(config.exportQuality * 100)}
        min={10}
        max={100}
        format={(v) => `${v}%`}
        onChange={(v) => onConfigChange("exportQuality", v / 100)}
      />
      <TextField
        label="Filename"
        value={config.exportFilename}
        placeholder="edited"
        onChange={(v) => onConfigChange("exportFilename", v)}
      />
      <OptionRow label="Close after save">
        <Toggle
          checked={config.exportCloseAfterSave}
          onChange={(v) => onConfigChange("exportCloseAfterSave", v)}
        />
      </OptionRow>
    </div>
  );
}
