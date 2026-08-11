import type { EditxEngine } from "@editx/engine";
import {
  ChevronDown,
  CircleOff,
  Grid2x2,
  ImageIcon,
  Move,
  PaintBucket,
  Paintbrush,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  IconButton,
  Slider,
} from "../../ui";
import { ACTIVE_PANEL_TINT, PanelButton } from "./panel-button.component";

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
  refresh: () => void;
}

/**
 * Shared property buttons rendered for every block type (with type-specific
 * variations). Presentational: side-panel toggles and opacity mutation are
 * delegated via props.
 */
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
    refresh,
  } = props;

  const { t } = useTranslation();

  const fillEnabled = engine.block.isFillEnabled(blockId);
  const styleActive = propertySidePanel === "adjust" || propertySidePanel === "filter";
  return (
    <>
      {/* Color (text + graphic only) */}
      {!isImage && (
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

      {/* No-fill toggle (graphic only) */}
      {!isText && !isImage && (
        <IconButton
          onClick={() => {
            engine.block.setFillEnabled(blockId, !fillEnabled);
            refresh();
          }}
          label={fillEnabled ? t("block.disableFill") : t("block.enableFill")}
          aria-pressed={!fillEnabled}
          className={cn(!fillEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground")}
          icon={<CircleOff className="h-4 w-4" />}
        />
      )}

      {/* Fill kind (graphic only — Color / Gradient / Image) */}
      {!isText && !isImage && (
        <PanelButton
          panel="fill"
          icon={<PaintBucket className="h-4 w-4" />}
          label={t("fill.kind")}
          active={propertySidePanel === "fill"}
          onToggle={onTogglePanel}
        />
      )}

      {/* Background (text only) */}
      {isText && (
        <PanelButton
          panel="background"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.background")}
          active={propertySidePanel === "background"}
          onToggle={onTogglePanel}
        />
      )}

      {/* Stroke (graphic only) */}
      {!isText && !isImage && (
        <PanelButton
          panel="stroke"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.stroke")}
          active={propertySidePanel === "stroke"}
          onToggle={onTogglePanel}
        />
      )}

      {/* Image fill panel button (image only) */}
      {isImage && (
        <PanelButton
          panel="imageFill"
          icon={<ImageIcon className="h-4 w-4" />}
          label={t("block.image")}
          active={propertySidePanel === "imageFill"}
          onToggle={onTogglePanel}
        />
      )}

      {/* Style dropdown (image only — Adjustments / Filters) */}
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

      {/* Shadow */}
      <PanelButton
        panel="shadow"
        icon={<Sun className="h-4 w-4" />}
        label={t("block.shadow")}
        active={propertySidePanel === "shadow"}
        onToggle={onTogglePanel}
      />

      {/* Opacity (dropdown) */}
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

      {/* Position */}
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
