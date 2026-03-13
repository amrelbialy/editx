import React from 'react';
import {
  Crop,
  SlidersHorizontal,
  Blend,
  Type,
  Hexagon,
  ImagePlus,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../utils/cn';
import { useConfig } from '../../config/config-context';
import type { ImageEditorToolId } from '../../config/config.types';

interface ToolDef {
  id: ImageEditorToolId;
  label: string;
  icon: LucideIcon;
  group: 'editing' | 'annotation';
}

const allTools: ToolDef[] = [
  { id: 'crop', label: 'Crop', icon: Crop, group: 'editing' },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal, group: 'editing' },
  { id: 'filter', label: 'Filters', icon: Blend, group: 'editing' },
  { id: 'text', label: 'Text', icon: Type, group: 'annotation' },
  { id: 'shapes', label: 'Shapes', icon: Hexagon, group: 'annotation' },
  { id: 'image', label: 'Image', icon: ImagePlus, group: 'annotation' },
];

interface ToolSidebarProps {
  activeTool: ImageEditorToolId | null;
  onToolSelect: (tool: ImageEditorToolId) => void;
  /** Custom tools registered via config.customTools */
  customTools?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group?: 'editing' | 'annotation';
  }>;
  /** Slot: extra content rendered above the Apps button */
  sidebarBottom?: React.ReactNode;
}

export const ToolSidebar: React.FC<ToolSidebarProps> = ({
  activeTool,
  onToolSelect,
  customTools: customToolDefs = [],
  sidebarBottom,
}) => {
  const config = useConfig();
  const enabledTools = config.tools;
  const showLabels = config.ui?.toolSidebar?.showLabels ?? true;
  const showSeparators = config.ui?.toolSidebar?.groupSeparators ?? true;

  const visibleTools = allTools.filter((t) => enabledTools.includes(t.id));
  const editingTools = visibleTools.filter((t) => t.group === 'editing');
  const annotationTools = visibleTools.filter((t) => t.group === 'annotation');

  const renderToolButton = (tool: ToolDef) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;

    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onToolSelect(tool.id)}
            className={cn(
              'flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              isActive && 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {showLabels && (
              <span className="text-[10px] mt-1 leading-none">{tool.label}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {tool.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav
      role="toolbar"
      aria-label="Editor tools"
      aria-orientation="vertical"
      className={cn(
        'flex flex-col items-center w-[72px] py-2',
        'bg-sidebar border-r border-sidebar-border',
      )}
    >
      {/* Editing tools group */}
      {editingTools.length > 0 && (
        <div className="flex flex-col items-center w-full gap-0.5 px-1.5">
          {editingTools.map(renderToolButton)}
        </div>
      )}

      {/* Separator between groups */}
      {showSeparators && editingTools.length > 0 && annotationTools.length > 0 && (
        <Separator className="my-2 w-10" />
      )}

      {/* Annotation tools group */}
      {annotationTools.length > 0 && (
        <div className="flex flex-col items-center w-full gap-0.5 px-1.5">
          {annotationTools.map(renderToolButton)}
        </div>
      )}

      {/* Custom tools */}
      {customToolDefs.length > 0 && (
        <>
          {showSeparators && <Separator className="my-2 w-10" />}
          <div className="flex flex-col items-center w-full gap-0.5 px-1.5">
            {customToolDefs.map((ct) => {
              const Icon = ct.icon;
              const isActive = activeTool === ct.id;
              return (
                <Tooltip key={ct.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToolSelect(ct.id as ImageEditorToolId)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-md transition-colors',
                        'text-muted-foreground hover:text-foreground hover:bg-accent',
                        isActive && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {showLabels && (
                        <span className="text-[10px] mt-1 leading-none">{ct.label}</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{ct.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </>
      )}

      {/* Slot: extra sidebar content */}
      {sidebarBottom}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Apps button pinned to bottom */}
      <div className="px-1.5 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <LayoutGrid className="h-5 w-5" />
              {showLabels && (
                <span className="text-[10px] mt-1 leading-none">Apps</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Apps
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
};
