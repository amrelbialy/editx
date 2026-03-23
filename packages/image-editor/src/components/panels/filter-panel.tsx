import { FILTER_PRESETS } from "@creative-editor/engine";
import type React from "react";
import { cn } from "../../utils/cn";

export interface FilterPanelProps {
  activeFilter: string;
  onSelect: (name: string) => void;
}

const presetEntries = Array.from(FILTER_PRESETS.entries());

export const FilterPanel: React.FC<FilterPanelProps> = ({ activeFilter, onSelect }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">Presets</div>

      {/* Original (no filter) */}
      <button
        onClick={() => onSelect("")}
        data-testid="filter-original"
        className={cn(
          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
          activeFilter === ""
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent",
        )}
      >
        Original
      </button>

      {/* Preset list */}
      {presetEntries.map(([name, info]) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          data-testid={`filter-${name}`}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
            activeFilter === name
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent",
          )}
        >
          {info.label}
        </button>
      ))}
    </div>
  );
};
