import { cn } from "../../../utils/cn";
import { focusRing } from "../styles";
import type { SegmentedControlProps } from "./segmented-control.types";

/**
 * Two-or-more option toggle styled as a single track. Replaces the
 * hand-rolled tab/segment switchers (crop mode, alignment, etc.) so they all
 * share one look and focus behavior.
 */
export const SegmentedControl = <T extends string>(props: SegmentedControlProps<T>) => {
  const { options, value, onValueChange, className, ariaLabel } = props;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            type="button"
            role="tab"
            key={option.value}
            aria-selected={selected}
            aria-label={option.ariaLabel}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md text-fluid font-medium transition-colors",
              focusRing,
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
