import type React from "react";
import type { ButtonProps } from "../button";

export interface IconButtonProps extends Omit<ButtonProps, "children" | "aria-label"> {
  /** Accessible name; also used as the tooltip text unless `tooltip` is set. Required. */
  label: string;
  /** Icon element to render inside the button. */
  icon: React.ReactNode;
  /** Override tooltip content (defaults to `label`, e.g. to add a shortcut hint). */
  tooltip?: React.ReactNode;
  /** Tooltip placement. */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Set false to render only the button without a tooltip. */
  showTooltip?: boolean;
  /** Extra className for the tooltip content. */
  tooltipClassName?: string;
}
