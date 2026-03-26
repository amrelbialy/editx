import type React from "react";
import { useFilterThumbnails } from "../../hooks/use-filter-thumbnails";
import { cn } from "../../utils/cn";
import { Spinner } from "../ui/spinner";

export interface FilterPanelProps {
  activeFilter: string;
  onSelect: (name: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ activeFilter, onSelect }) => {
  const thumbnails = useFilterThumbnails();

  return (
    <fieldset className="flex flex-col gap-2" aria-label="Filter presets">
      {thumbnails ? (
        thumbnails.map((thumb) => {
          const isActive = activeFilter === thumb.name;
          return (
            <button
              type="button"
              key={thumb.name}
              onClick={() => onSelect(thumb.name)}
              data-testid={`filter-${thumb.name || "original"}`}
              className={cn(
                "group w-full overflow-hidden rounded-lg transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-foreground/20",
              )}
            >
              <div className="relative">
                <img
                  src={thumb.dataUrl}
                  alt={thumb.label}
                  className="w-full h-8 object-cover block @5xl/editor:h-10"
                  draggable={false}
                />
                {/* Overlaid label — visible by default, hidden on hover/active */}
                <span
                  className={cn(
                    "absolute inset-0 flex items-center px-2 @5xl/editor:px-3",
                    "text-sm font-medium text-white drop-shadow-md @5xl/editor:text-base",
                    (isActive || undefined) && "opacity-0",
                    !isActive && "group-hover:opacity-0",
                  )}
                >
                  {thumb.label}
                </span>
              </div>
              {/* Expanded label bar — shown on hover/active */}
              <div
                className={cn(
                  "grid transition-all",
                  isActive
                    ? "grid-rows-[1fr] bg-foreground"
                    : "grid-rows-[0fr] group-hover:grid-rows-[1fr] group-hover:bg-accent",
                )}
              >
                <div className="overflow-hidden">
                  <span
                    className={cn(
                      "block px-2 py-0.5 text-sm font-medium text-left @5xl/editor:px-3 @5xl/editor:py-1 @5xl/editor:text-base",
                      isActive ? "text-background" : "text-accent-foreground",
                    )}
                  >
                    {thumb.label}
                  </span>
                </div>
              </div>
            </button>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground @5xl/editor:text-base">
          <Spinner size="sm" />
          Generating previews…
        </div>
      )}
    </fieldset>
  );
};
