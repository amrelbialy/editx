import * as React from "react";
import { Button } from "../button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";
import type { IconButtonProps } from "./icon-button.types";

/**
 * Icon-only button with a built-in tooltip. The single `label` prop drives
 * both the accessible name (`aria-label`) and the tooltip text, so every
 * icon action in the app is labelled and hinted the same way. Never use the
 * native `title` attribute for icon buttons — use this instead.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
  const {
    label,
    icon,
    tooltip,
    tooltipSide = "bottom",
    showTooltip = true,
    tooltipClassName,
    variant = "ghost",
    size = "icon",
    ...rest
  } = props;

  const button = (
    <Button ref={ref} variant={variant} size={size} aria-label={label} {...rest}>
      {icon}
    </Button>
  );

  if (!showTooltip) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide} className={tooltipClassName}>
          {tooltip ?? label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
IconButton.displayName = "IconButton";
