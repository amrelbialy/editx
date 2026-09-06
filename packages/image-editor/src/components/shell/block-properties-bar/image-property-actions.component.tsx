import { ChevronDown, Crop, ImageIcon, Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../ui";
import { ACTIVE_PANEL_TINT, PanelButton } from "./panel-button.component";

interface ImagePropertyActionsProps {
  isImage: boolean;
  hasImageFill: boolean;
  propertySidePanel: PropertySidePanel;
  onTogglePanel: (panel: PropertySidePanel) => void;
  onCropImageFill?: () => void;
}

const triggerBase = "gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap";

export const ImagePropertyActions: React.FC<ImagePropertyActionsProps> = (props) => {
  const { isImage, hasImageFill, propertySidePanel, onTogglePanel, onCropImageFill } = props;

  const { t } = useTranslation();

  const showStyles = isImage || hasImageFill;
  const styleActive = propertySidePanel === "adjust" || propertySidePanel === "filter";

  if (!showStyles) return null;

  return (
    <>
      {isImage && (
        <PanelButton
          panel="imageFill"
          icon={<ImageIcon className="h-4 w-4" />}
          label={t("block.image")}
          active={propertySidePanel === "imageFill"}
          onToggle={onTogglePanel}
        />
      )}

      {hasImageFill && onCropImageFill && (
        <Button
          variant="ghost"
          className={cn(triggerBase, "text-muted-foreground")}
          onClick={onCropImageFill}
        >
          <Crop className="h-4 w-4" />
          {t("tools.crop")}
        </Button>
      )}

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
    </>
  );
};
