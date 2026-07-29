import * as React from "react";
import { cn } from "../../../utils/cn";
import { focusRing } from "../styles";
import type { ColorSwatchProps } from "./color-swatch.types";

const sizeClass = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
} as const;

/**
 * Native color picker rendered as a consistent swatch. Replaces the
 * hand-rolled `<input type="color">` usages so every color control shares
 * the same border, radius, and focus ring.
 */
export const ColorSwatch = React.forwardRef<HTMLInputElement, ColorSwatchProps>((props, ref) => {
  const { value, size = "md", className, ...rest } = props;

  return (
    <input
      ref={ref}
      type="color"
      value={value}
      className={cn(
        "cursor-pointer rounded-md border border-border bg-transparent p-0",
        "[&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none",
        "[&::-webkit-color-swatch-wrapper]:p-0.5",
        sizeClass[size],
        focusRing,
        className,
      )}
      {...rest}
    />
  );
});
ColorSwatch.displayName = "ColorSwatch";
