import { CheckList } from "../controls";
import { ADJUST_CONTROLS } from "../playground.constants";
import type { SectionProps } from "../playground.types";

const CONTROL_OPTIONS = ADJUST_CONTROLS.map((c) => ({
  label: c.charAt(0).toUpperCase() + c.slice(1),
  value: c,
}));

export function AdjustSection(props: SectionProps) {
  const { config, onConfigChange } = props;

  const toggle = (control: string) => {
    const next = config.adjustControls.includes(control)
      ? config.adjustControls.filter((c) => c !== control)
      : [...config.adjustControls, control];
    onConfigChange("adjustControls", next);
  };

  return <CheckList options={CONTROL_OPTIONS} selected={config.adjustControls} onToggle={toggle} />;
}
