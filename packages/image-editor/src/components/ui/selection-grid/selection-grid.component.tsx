import type React from "react";
import { cn } from "../../../utils/cn";
import type { SelectionGridProps } from "./selection-grid.types";

export const SelectionGrid: React.FC<SelectionGridProps> = (props) => {
  const { items, activeId, onSelect, columns = 3, className, ariaLabel } = props;

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn("grid gap-1.5 border-none p-0 m-0", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          data-testid={`grid-${item.id}`}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-md px-1.5 py-2 text-sm transition-colors @5xl/editor:gap-1 @5xl/editor:px-2 @5xl/editor:py-2.5 @5xl/editor:text-base",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            activeId === item.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </fieldset>
  );
};
