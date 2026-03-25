import {
  Blend,
  Crop,
  Hexagon,
  ImagePlus,
  type LucideIcon,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import type React from "react";
import type { ImageEditorToolId } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
import { cn } from "../../utils/cn";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ToolDef {
  id: ImageEditorToolId;
  label: string;
  icon: LucideIcon;
  group: "editing" | "annotation";
  shortcut?: string;
}

const allTools: ToolDef[] = [
  { id: "crop", label: "Crop", icon: Crop, group: "editing", shortcut: "C" },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal, group: "editing", shortcut: "A" },
  { id: "filter", label: "Filters", icon: Blend, group: "editing", shortcut: "F" },
  { id: "text", label: "Text", icon: Type, group: "annotation", shortcut: "T" },
  { id: "shapes", label: "Shapes", icon: Hexagon, group: "annotation", shortcut: "S" },
  { id: "image", label: "Image", icon: ImagePlus, group: "annotation", shortcut: "I" },
];

interface ToolNavProps {
  activeTool: ImageEditorToolId | null;
  onToolSelect: (tool: ImageEditorToolId) => void;
  customTools?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    group?: "editing" | "annotation";
  }>;
  sidebarBottom?: React.ReactNode;
}

export const ToolNav: React.FC<ToolNavProps> = (props) => {
  const { activeTool, onToolSelect, customTools: customToolDefs = [], sidebarBottom } = props;

  const config = useConfig();
  const enabledTools = config.tools;
  const showLabels = config.ui?.toolSidebar?.showLabels ?? true;
  const showSeparators = config.ui?.toolSidebar?.groupSeparators ?? true;

  const visibleTools = allTools.filter((t) => enabledTools.includes(t.id));
  const editingTools = visibleTools.filter((t) => t.group === "editing");
  const annotationTools = visibleTools.filter((t) => t.group === "annotation");

  const renderToolButton = (tool: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut?: string;
  }) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;

    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onToolSelect(tool.id as ImageEditorToolId)}
            aria-pressed={isActive}
            aria-label={tool.label}
            aria-keyshortcuts={tool.shortcut}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-2 rounded-md transition-colors",
              "min-w-12 @3xl/editor:w-full @3xl/editor:py-2 @3xl/editor:px-1",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              isActive && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-6 w-6" />
            {showLabels && (
              <span className="text-xs mt-0.5 leading-none @3xl/editor:mt-1">{tool.label}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="hidden @3xl/editor:block">
          {tool.label}
          {tool.shortcut && (
            <kbd className="ml-1.5 text-xs opacity-60 font-mono">{tool.shortcut}</kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav
      role="toolbar"
      aria-label="Editor tools"
      aria-orientation="horizontal"
      className={cn(
        // Mobile (narrow): horizontal bottom bar
        "flex items-center justify-around",
        "bg-card border-t border-border",
        "px-1 py-1 overflow-x-auto order-last",
        // Desktop (wide @md = 28rem / 448px): vertical left sidebar
        "@3xl/editor:flex-col @3xl/editor:items-center @3xl/editor:justify-start",
        "@3xl/editor:w-18 @3xl/editor:py-2 @3xl/editor:px-0",
        "@3xl/editor:bg-sidebar @3xl/editor:border-t-0 @3xl/editor:border-r @3xl/editor:border-sidebar-border",
        "@3xl/editor:overflow-x-visible @3xl/editor:overflow-y-auto @3xl/editor:order-first",
      )}
    >
      {/* Editing tools */}
      <div className="contents @3xl/editor:flex @3xl/editor:flex-col @3xl/editor:items-center @3xl/editor:w-full @3xl/editor:gap-0.5 @3xl/editor:px-1.5">
        {editingTools.map(renderToolButton)}
      </div>

      {/* Separator between groups — desktop only */}
      {showSeparators && editingTools.length > 0 && annotationTools.length > 0 && (
        <Separator className="hidden @3xl/editor:block my-2 w-10" />
      )}

      {/* Annotation tools */}
      <div className="contents @3xl/editor:flex @3xl/editor:flex-col @3xl/editor:items-center @3xl/editor:w-full @3xl/editor:gap-0.5 @3xl/editor:px-1.5">
        {annotationTools.map(renderToolButton)}
      </div>

      {/* Custom tools */}
      {customToolDefs.length > 0 && (
        <>
          {showSeparators && <Separator className="hidden @3xl/editor:block my-2 w-10" />}
          <div className="contents @3xl/editor:flex @3xl/editor:flex-col @3xl/editor:items-center @3xl/editor:w-full @3xl/editor:gap-0.5 @3xl/editor:px-1.5">
            {customToolDefs.map(renderToolButton)}
          </div>
        </>
      )}

      {/* Desktop-only: sidebar bottom slot + spacer + Apps */}
      <div className="hidden @3xl/editor:flex @3xl/editor:flex-col @3xl/editor:flex-1 @3xl/editor:w-full">
        {sidebarBottom}
      </div>
    </nav>
  );
};
