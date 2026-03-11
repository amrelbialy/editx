import React from 'react';
import {
  Crop,
  SlidersHorizontal,
  Blend,
  Type,
  Hexagon,
  SmilePlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useConfig } from '../../config/config-context';
import type { ImageEditorToolId } from '../../config/config.types';

interface ToolDef {
  id: ImageEditorToolId;
  label: string;
  icon: LucideIcon;
}

const allTools: ToolDef[] = [
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'filter', label: 'Filters', icon: Blend },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'shapes', label: 'Shapes', icon: Hexagon },
  { id: 'sticker', label: 'Sticker', icon: SmilePlus },
];

interface MobileToolbarProps {
  activeTool: ImageEditorToolId | null;
  onToolSelect: (tool: ImageEditorToolId) => void;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  activeTool,
  onToolSelect,
}) => {
  const config = useConfig();
  const visibleTools = allTools.filter((t) => config.tools.includes(t.id));

  return (
    <div
      className={cn(
        'flex items-center justify-around',
        'bg-card border-t border-border',
        'px-1 py-1 overflow-x-auto',
      )}
      role="tablist"
      aria-label="Editor tools"
    >
      {visibleTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              'flex flex-col items-center justify-center min-w-[48px] py-1.5 px-2 rounded-md transition-colors',
              'text-muted-foreground',
              isActive && 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 leading-none">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
};
