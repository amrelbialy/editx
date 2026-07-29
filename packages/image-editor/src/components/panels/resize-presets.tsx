import type React from "react";
import { useState } from "react";
import type { ResizePreset, ResizePresetGroup } from "../../config/config.types";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { focusRing } from "../ui/styles";
import { AspectRatioIcon } from "./aspect-ratio-icon";

export interface ResizePresetsProps {
  groups: ResizePresetGroup[];
  activePreset: ResizePreset | null;
  onSelect: (preset: ResizePreset) => void;
}

const VISIBLE_COUNT = 3;

export const ResizePresets: React.FC<ResizePresetsProps> = ({ groups, activePreset, onSelect }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const isExpanded = expandedGroup === group.label;
        const hasMore = group.presets.length > VISIBLE_COUNT;
        const visiblePresets = isExpanded ? group.presets : group.presets.slice(0, VISIBLE_COUNT);

        return (
          <div key={group.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-fluid font-medium text-foreground">{group.label}</span>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-0.5 text-fluid text-muted-foreground"
                  onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                >
                  {isExpanded ? "Less" : `More (${group.presets.length - VISIBLE_COUNT})`}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 @3xl/editor:grid-cols-3">
              {visiblePresets.map((preset) => {
                const isActive =
                  activePreset?.width === preset.width && activePreset?.height === preset.height;
                return (
                  <button
                    type="button"
                    key={`${preset.width}x${preset.height}-${preset.label}`}
                    onClick={() => onSelect(preset)}
                    className={cn(
                      "flex flex-col items-center justify-start rounded-md px-1.5 py-2 text-fluid transition-colors min-w-0",
                      "cursor-pointer",
                      focusRing,
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <div className="flex items-center justify-center h-7">
                      <AspectRatioIcon
                        ratio={preset.width / preset.height}
                        className="h-6 w-6 @3xl/editor:h-7 @3xl/editor:w-7"
                      />
                    </div>
                    <span className="text-center leading-tight line-clamp-2 mt-1">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
