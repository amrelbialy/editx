import type React from "react";
import { cn } from "../../../utils/cn";
import { focusRing, interactiveBase } from "../styles";
import type { PresetCardProps } from "./preset-card.types";

/**
 * Clickable thumbnail tile with button semantics. Pure — the thumbnail is
 * passed as children and the accessible name via props, so it never needs to
 * interpret app-layer preview descriptors.
 */
export const PresetCard: React.FC<PresetCardProps> = (props) => {
  const { onClick, ariaLabel, label, children, active, className } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        interactiveBase,
        focusRing,
        "flex flex-col items-stretch gap-1 rounded-md border p-1.5",
        active ? "border-primary ring-2 ring-primary/50" : "border-border bg-muted hover:bg-accent",
        className,
      )}
    >
      <div className="flex h-18 w-full max-w-32 self-center items-center justify-center overflow-hidden rounded-sm">
        {children}
      </div>
      {label && (
        <span className="line-clamp-1 w-full text-center text-fluid text-muted-foreground">
          {label}
        </span>
      )}
    </button>
  );
};
