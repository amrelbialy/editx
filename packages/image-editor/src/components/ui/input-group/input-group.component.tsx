import type React from "react";
import { cn } from "../../../utils/cn";
import type { InputGroupProps } from "./input-group.types";

export const InputGroup: React.FC<InputGroupProps> = (props) => {
  const {
    label,
    value,
    onChange,
    type = "number",
    min,
    max,
    step,
    suffix,
    prefix,
    className,
    ...rest
  } = props;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {label && <span className="text-xs text-muted-foreground w-4 shrink-0">{label}</span>}
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <input
        type={type}
        value={type === "number" && typeof value === "number" ? Math.round(value) : value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className="w-full px-1.5 py-1 bg-muted border border-border rounded-md text-foreground text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        data-testid={rest["data-testid"]}
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
};
