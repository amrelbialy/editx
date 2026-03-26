import type React from "react";
import { cn } from "../../../utils/cn";
import { Slider } from "../slider";
import type { SliderFieldProps } from "./slider-field.types";

const defaultFormat = (v: number): string => String(Math.round(v));

export const SliderField: React.FC<SliderFieldProps> = (props) => {
  const {
    label,
    value,
    min,
    max,
    step,
    onChange,
    onCommit,
    formatValue = defaultFormat,
    className,
    ...rest
  } = props;

  return (
    <div className={cn("mb-1", className)}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-muted-foreground @5xl/editor:text-base">{label}</span>
        <span className="text-sm tabular-nums text-muted-foreground w-10 text-right @5xl/editor:text-base">
          {formatValue(value)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={onCommit ? ([v]) => onCommit(v) : undefined}
        data-testid={rest["data-testid"]}
      />
    </div>
  );
};
