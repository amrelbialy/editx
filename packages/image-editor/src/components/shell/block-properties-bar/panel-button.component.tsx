import type React from "react";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { Button, IconButton, Tooltip, TooltipContent, TooltipTrigger } from "../../ui";

export interface PanelButtonProps {
  panel: PropertySidePanel;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  active: boolean;
  onToggle: (panel: PropertySidePanel) => void;
}

/** Shared "active" tint for property-toggle buttons (panel + style triggers). */
export const ACTIVE_PANEL_TINT = "bg-primary/20 text-primary ring-1 ring-primary/30";

/**
 * Toolbar button that toggles a property side-panel. Renders an `IconButton`
 * when there is no visible label (icon-only, e.g. the advanced button) and a
 * labelled `Button` otherwise.
 */
export const PanelButton: React.FC<PanelButtonProps> = (props) => {
  const { panel, icon, label, tooltip, active, onToggle } = props;

  if (!label) {
    return (
      <IconButton
        onClick={() => onToggle(panel)}
        label={tooltip ?? ""}
        aria-pressed={active}
        className={cn(active ? ACTIVE_PANEL_TINT : "text-muted-foreground")}
        icon={icon}
      />
    );
  }

  const button = (
    <Button
      variant="ghost"
      onClick={() => onToggle(panel)}
      aria-label={tooltip}
      className={cn(
        "gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap",
        active
          ? cn(ACTIVE_PANEL_TINT, "hover:bg-primary/20 hover:text-primary")
          : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
};
