import { OptionRow, TextField, Toggle } from "../controls";
import type { SectionProps } from "../playground.types";

export function UISection(props: SectionProps) {
  const { config, onConfigChange } = props;

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Title"
        value={config.title}
        placeholder="Image Editor"
        onChange={(v) => onConfigChange("title", v)}
      />

      <div className="flex flex-col gap-2.5">
        <OptionRow label="Show title">
          <Toggle checked={config.showTitle} onChange={(v) => onConfigChange("showTitle", v)} />
        </OptionRow>
        <OptionRow label="Show close button">
          <Toggle
            checked={config.showCloseButton}
            onChange={(v) => onConfigChange("showCloseButton", v)}
          />
        </OptionRow>
        <OptionRow label="Back arrow" hint="Use ← instead of ✕">
          <Toggle
            checked={config.showBackButton}
            onChange={(v) => onConfigChange("showBackButton", v)}
          />
        </OptionRow>
        <OptionRow label="Unsaved changes warning">
          <Toggle
            checked={config.unsavedChangesWarning}
            onChange={(v) => onConfigChange("unsavedChangesWarning", v)}
          />
        </OptionRow>
        <OptionRow label="Compact sidebar" hint="Icon-only tool rail">
          <Toggle
            checked={config.compactSidebar}
            onChange={(v) => onConfigChange("compactSidebar", v)}
          />
        </OptionRow>
        <OptionRow label="Group separators">
          <Toggle
            checked={config.groupSeparators}
            onChange={(v) => onConfigChange("groupSeparators", v)}
          />
        </OptionRow>
      </div>
    </div>
  );
}
