import * as React from "react";
import { cn } from "../../../utils/cn";
import { controlBase, focusWithinRing } from "../styles";
import type { InputProps } from "./input.types";

const labelClass = "text-fluid text-muted-foreground shrink-0";
const affixClass = "text-fluid text-muted-foreground";

/**
 * Single text-like input control. The native input `type` is controlled via
 * the `type` prop ("text" | "number" | ...). Optional inline `label`,
 * `prefix`, and `suffix` are supported. Styling comes from the shared tokens
 * so every input looks and focuses identically.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    label,
    prefix,
    suffix,
    type = "text",
    value,
    className,
    labelClassName,
    fieldClassName,
    ...rest
  } = props;

  const displayValue = type === "number" && typeof value === "number" ? Math.round(value) : value;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {label && <span className={cn(labelClass, labelClassName)}>{label}</span>}
      <div
        className={cn(
          controlBase,
          focusWithinRing,
          "flex flex-1 items-center gap-1 text-fluid",
          fieldClassName,
        )}
      >
        {prefix && <span className={affixClass}>{prefix}</span>}
        <input
          ref={ref}
          type={type}
          value={displayValue}
          className={cn(
            "w-0 flex-1 bg-transparent text-foreground outline-none tabular-nums",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
          {...rest}
        />
        {suffix && <span className={affixClass}>{suffix}</span>}
      </div>
    </div>
  );
});
Input.displayName = "Input";
