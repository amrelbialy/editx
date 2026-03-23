import { Slider as SliderPrimitive } from "@base-ui-components/react/slider";
import * as React from "react";
import { cn } from "../../../utils/cn";

interface SliderProps
  extends Omit<SliderPrimitive.Root.Props, "onValueChange" | "onValueCommitted"> {
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueChange,
  onValueCommit,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]),
    [value, defaultValue, min],
  );

  const handleValueChange = React.useCallback(
    (val: number | readonly number[], _eventDetails: SliderPrimitive.Root.ChangeEventDetails) => {
      if (onValueChange) {
        onValueChange(Array.isArray(val) ? [...val] : [val]);
      }
    },
    [onValueChange],
  );

  const handleValueCommitted = React.useCallback(
    (val: number | readonly number[], _eventDetails: SliderPrimitive.Root.CommitEventDetails) => {
      if (onValueCommit) {
        onValueCommit(Array.isArray(val) ? [...val] : [val]);
      }
    },
    [onValueCommit],
  );

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full", className)}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      onValueChange={handleValueChange}
      onValueCommitted={handleValueCommitted}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track className="bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full select-none">
          <SliderPrimitive.Indicator className="bg-primary h-full select-none" />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="border-primary/50 ring-ring/50 block h-4 w-4 shrink-0 rounded-full border bg-background shadow transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-2 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export type { SliderProps };
export { Slider };
