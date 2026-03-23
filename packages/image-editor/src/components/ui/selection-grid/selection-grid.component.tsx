import type React from "react";
import { cn } from "../../../utils/cn";
import type { SelectionGridProps } from "./selection-grid.types";

export const SelectionGrid: React.FC<SelectionGridProps> = (props) => {
  const { items, activeId, onSelect, columns = 3, className } = props;

  return (
    <div
      className={cn("grid gap-1.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          data-testid={`grid-${item.id}`}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs transition-colors",
            activeId === item.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};
