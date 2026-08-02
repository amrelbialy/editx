import { NumberField } from "../controls";
import type { SectionProps } from "../playground.types";

const MB = 1024 * 1024;

export function ImageSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  return (
    <div className="flex flex-col gap-3">
      <NumberField
        label="Max file size"
        value={Math.round((config.imageMaxFileSize / MB) * 10) / 10}
        min={0.1}
        step={0.5}
        suffix="MB"
        onChange={(v) => onConfigChange("imageMaxFileSize", Math.round(v * MB))}
      />
      <NumberField
        label="Max dimension"
        value={config.imageMaxDimension}
        min={16}
        step={16}
        suffix="px"
        onChange={(v) => onConfigChange("imageMaxDimension", v)}
      />
    </div>
  );
}
