import type React from "react";
import { cn } from "../../../utils/cn";
import { focusRing } from "../styles";
import type { SwitchFieldProps } from "./switch-field.types";

export const SwitchField: React.FC<SwitchFieldProps> = (props) => {
  const { label, checked, onChange, children } = props;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            focusRing,
            checked ? "bg-primary" : "bg-muted border border-border",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
        <span className="text-fluid text-foreground">{label}</span>
      </label>
      {checked && children}
    </div>
  );
};
