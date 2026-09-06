import type { EditxEngine } from "@editx/engine";
import { Grid2x2, Move, PaintBucket, Paintbrush, Shapes, Sun } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Slider } from "../../ui";
import { ImagePropertyActions } from "./image-property-actions.component";
import { PanelButton } from "./panel-button.component";
import { ShapeGeometryButton } from "./shape-geometry-button.component";

const triggerBase = "gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap";

export interface BlockPropertyButtonsProps {
  engine: EditxEngine;
  blockId: number;
  isText: boolean;
  isImage: boolean;
  hasImageFill: boolean;
  colorSwatch: string;
  opacity: number;
  propertySidePanel: PropertySidePanel;
  onTogglePanel: (panel: PropertySidePanel) => void;
  onOpacityChange: (value: number[]) => void;
  onCropImageFill?: () => void;
}

export const BlockPropertyButtons: React.FC<BlockPropertyButtonsProps> = (props) => {
  const {
    engine,
    blockId,
    isText,
    isImage,
    hasImageFill,
    colorSwatch,
    opacity,
    propertySidePanel,
    onTogglePanel,
    onOpacityChange,
    onCropImageFill,
  } = props;

  const { t } = useTranslation();

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

      <ImagePropertyActions
        isImage={isImage}
        hasImageFill={hasImageFill}
        propertySidePanel={propertySidePanel}
        onTogglePanel={onTogglePanel}
        onCropImageFill={onCropImageFill}
      />

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
