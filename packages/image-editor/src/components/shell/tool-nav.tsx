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
import { useTranslation } from "../../i18n/i18n-context";
import type { TranslationKey } from "../../i18n/translations/en";
import { cn } from "../../utils/cn";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ToolDef {
  id: ImageEditorToolId;
  labelKey: TranslationKey;
  icon: LucideIcon;
  group: "editing" | "annotation";
  shortcut?: string;
}

const allTools: ToolDef[] = [
  { id: "crop", labelKey: "tools.crop", icon: Crop, group: "editing", shortcut: "C" },
  {
    id: "adjust",
    labelKey: "tools.adjust",
    icon: SlidersHorizontal,
    group: "editing",
    shortcut: "A",
  },
  { id: "filter", labelKey: "tools.filter", icon: Blend, group: "editing", shortcut: "F" },
  { id: "text", labelKey: "tools.text", icon: Type, group: "annotation", shortcut: "T" },
  { id: "shapes", labelKey: "tools.shapes", icon: Hexagon, group: "annotation", shortcut: "S" },
  { id: "image", labelKey: "tools.image", icon: ImagePlus, group: "annotation", shortcut: "I" },
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
  const { t } = useTranslation();
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
              "flex flex-col items-center justify-center py-1.5 px-1.5 rounded-md transition-colors",
              "min-w-10 @xl/editor:w-full @xl/editor:py-2 @xl/editor:px-1",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              isActive && "bg-primary text-primary-foreground",
            )}
          >
            <Icon className="h-4.5 w-4.5 @5xl/editor:h-6 @5xl/editor:w-6" />
            {showLabels && (
              <span className="text-[10px] mt-0.5 leading-none @5xl/editor:text-xs @xl/editor:mt-1">
                {tool.label}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="hidden @xl/editor:block">
          {tool.label}
          {tool.shortcut && (
            <kbd className="ml-1.5 text-xs opacity-60 font-mono">{tool.shortcut}</kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  const resolvedTools = visibleTools.map((td) => ({
    ...td,
    label: t(td.labelKey),
  }));
  const resolvedEditing = resolvedTools.filter((td) => td.group === "editing");
  const resolvedAnnotation = resolvedTools.filter((td) => td.group === "annotation");

  return (
    <nav
      role="toolbar"
      aria-label={t("a11y.editorTools")}
      aria-orientation="horizontal"
      className={cn(
        // Mobile (narrow): horizontal bottom bar
        "flex items-center justify-around",
        "bg-card border-t border-border",
        "px-1 py-1 overflow-x-auto order-last",
        // Desktop (wide): vertical left sidebar
        "@xl/editor:flex-col @xl/editor:items-center @xl/editor:justify-start",
        "@xl/editor:w-18 @xl/editor:py-2 @xl/editor:px-0",
        "@xl/editor:bg-sidebar @xl/editor:border-t-0 @xl/editor:border-r @xl/editor:border-sidebar-border",
        "@xl/editor:overflow-x-visible @xl/editor:overflow-y-auto @xl/editor:order-first",
      )}
    >
      {/* Editing tools */}
      <div className="contents @xl/editor:flex @xl/editor:flex-col @xl/editor:items-center @xl/editor:w-full @xl/editor:gap-0.5 @xl/editor:px-1.5">
        {resolvedEditing.map(renderToolButton)}
      </div>

      {/* Separator between groups — desktop only */}
      {showSeparators && editingTools.length > 0 && annotationTools.length > 0 && (
        <Separator className="hidden @xl/editor:block my-2 w-10" />
      )}

      {/* Annotation tools */}
      <div className="contents @xl/editor:flex @xl/editor:flex-col @xl/editor:items-center @xl/editor:w-full @xl/editor:gap-0.5 @xl/editor:px-1.5">
        {resolvedAnnotation.map(renderToolButton)}
      </div>

      {/* Custom tools */}
      {customToolDefs.length > 0 && (
        <>
          {showSeparators && <Separator className="hidden @xl/editor:block my-2 w-10" />}
          <div className="contents @xl/editor:flex @xl/editor:flex-col @xl/editor:items-center @xl/editor:w-full @xl/editor:gap-0.5 @xl/editor:px-1.5">
            {customToolDefs.map(renderToolButton)}
          </div>
        </>
      )}

      {/* Desktop-only: sidebar bottom slot + spacer + Apps */}
      <div className="hidden @xl/editor:flex @xl/editor:flex-col @xl/editor:flex-1 @xl/editor:w-full">
        {sidebarBottom}
      </div>
    </nav>
  );
};
