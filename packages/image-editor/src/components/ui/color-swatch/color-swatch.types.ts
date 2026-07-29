import type React from "react";

export interface ColorSwatchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Current color value (hex). */
  value: string;
  /** Swatch size. */
  size?: "sm" | "md" | "lg";
}
