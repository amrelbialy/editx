import type { EditxEngine } from "@editx/engine";
import {
  ChevronDown,
  Grid2x2,
  ImageIcon,
  Move,
  PaintBucket,
  Paintbrush,
  Palette,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Slider } from "../../ui";
import { ACTIVE_PANEL_TINT, PanelButton } from "./panel-button.component";
import { ShapeGeometryButton } from "./shape-geometry-button.component";

const triggerBase = "gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap";

export interface BlockPropertyButtonsProps {
  engine: EditxEngine;
  blockId: number;
  isText: boolean;
  isImage: boolean;
  colorSwatch: string;
  opacity: number;
  propertySidePanel: PropertySidePanel;
  onTogglePanel: (panel: PropertySidePanel) => void;
  onOpacityChange: (value: number[]) => void;
}

export const BlockPropertyButtons: React.FC<BlockPropertyButtonsProps> = (props) => {
  const {
    engine,
    blockId,
    isText,
    isImage,
    colorSwatch,
    opacity,
    propertySidePanel,
    onTogglePanel,
    onOpacityChange,
  } = props;

  const { t } = useTranslation();

  const styleActive = propertySidePanel === "adjust" || propertySidePanel === "filter";
  return (
    <>
      {!isText && !isImage && (
        <PanelButton
          panel="shape"
          icon={<Shapes className="h-4 w-4" />}
          label={t("panel.shapes")}
          active={propertySidePanel === "shape"}
          onToggle={onTogglePanel}
        />
      )}
      {!isText && !isImage && <ShapeGeometryButton engine={engine} blockId={blockId} />}

      {isText && (
        <PanelButton
          panel="color"
          icon={
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ background: colorSwatch }}
            />
          }
          label={t("block.color")}
          active={propertySidePanel === "color"}
          onToggle={onTogglePanel}
        />
      )}

      {!isText && !isImage && (
        <PanelButton
          panel="fill"
          icon={<PaintBucket className="h-4 w-4" />}
          label={t("fill.kind")}
          active={propertySidePanel === "fill"}
          onToggle={onTogglePanel}
        />
      )}

      {isText && (
        <PanelButton
          panel="background"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.background")}
          active={propertySidePanel === "background"}
          onToggle={onTogglePanel}
        />
      )}

      {!isText && !isImage && (
        <PanelButton
          panel="stroke"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.stroke")}
          active={propertySidePanel === "stroke"}
          onToggle={onTogglePanel}
        />
      )}

      {isImage && (
        <PanelButton
          panel="imageFill"
          icon={<ImageIcon className="h-4 w-4" />}
          label={t("block.image")}
          active={propertySidePanel === "imageFill"}
          onToggle={onTogglePanel}
        />
      )}

      {isImage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                triggerBase,
                styleActive
                  ? cn(ACTIVE_PANEL_TINT, "hover:bg-primary/20 hover:text-primary")
                  : "text-muted-foreground",
              )}
            >
              <Sparkles className="h-4 w-4" />
              {t("block.style")}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-1" align="center">
            <Button
              variant="ghost"
              onClick={() => onTogglePanel("adjust")}
              className={cn(
                "w-full justify-start gap-2",
                propertySidePanel === "adjust"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("panel.adjustments")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onTogglePanel("filter")}
              className={cn(
                "w-full justify-start gap-2",
                propertySidePanel === "filter"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Palette className="h-4 w-4" />
              {t("panel.filters")}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <PanelButton
        panel="shadow"
        icon={<Sun className="h-4 w-4" />}
        label={t("block.shadow")}
        active={propertySidePanel === "shadow"}
        onToggle={onTogglePanel}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn(triggerBase, "text-muted-foreground")}>
            <Grid2x2 className="h-4 w-4" />
            {t("block.opacity")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 p-3"
          align="center"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t("block.opacity")}</span>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[opacity]}
              onValueChange={onOpacityChange}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <PanelButton
        panel="position"
        icon={<Move className="h-4 w-4" />}
        label={t("block.position")}
        active={propertySidePanel === "position"}
        onToggle={onTogglePanel}
      />
    </>
  );
};
