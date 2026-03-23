import type React from "react";
import { useState } from "react";
import type { ResizePreset, ResizePresetGroup } from "../../config/config.types";
import { cn } from "../../utils/cn";

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
              <span className="text-xs font-medium text-foreground">{group.label}</span>
              {hasMore && (
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? "Less" : `More (${group.presets.length - VISIBLE_COUNT})`}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {visiblePresets.map((preset) => {
                const isActive =
                  activePreset?.width === preset.width && activePreset?.height === preset.height;
                return (
                  <button
                    key={`${preset.width}x${preset.height}-${preset.label}`}
                    onClick={() => onSelect(preset)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[11px] transition-colors min-w-0",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <PresetIcon width={preset.width} height={preset.height} active={isActive} />
                    <span className="text-center leading-tight line-clamp-2">{preset.label}</span>
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

/** Tiny aspect-ratio icon that reflects the preset's proportions. */
function PresetIcon({ width, height, active }: { width: number; height: number; active: boolean }) {
  const maxDim = 24;
  const ratio = width / height;
  let w: number, h: number;
  if (ratio >= 1) {
    w = maxDim;
    h = maxDim / ratio;
  } else {
    h = maxDim;
    w = maxDim * ratio;
  }
  return (
    <div
      className={cn(
        "rounded-[3px] border-[1.5px]",
        active ? "border-primary-foreground" : "border-muted-foreground",
      )}
      style={{ width: Math.max(w, 8), height: Math.max(h, 8) }}
    />
  );
}
