import type React from "react";
import type { SwitchFieldProps } from "./switch-field.types";

export const SwitchField: React.FC<SwitchFieldProps> = (props) => {
  const { label, checked, onChange, children } = props;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">{label}</span>
      </label>
      {checked && children}
    </div>
  );
};
