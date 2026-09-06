import { Grid2x2, Move } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, Slider } from "../../ui";
import { PanelButton } from "./panel-button.component";

interface SharedBlockPropertyButtonsProps {
  opacity: number;
  propertySidePanel: PropertySidePanel;
  onTogglePanel: (panel: PropertySidePanel) => void;
  onOpacityChange: (value: number[]) => void;
}

export const SharedBlockPropertyButtons: React.FC<SharedBlockPropertyButtonsProps> = (props) => {
  const { opacity, propertySidePanel, onTogglePanel, onOpacityChange } = props;

  const { t } = useTranslation();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="gap-1.5 px-2.5 h-8 text-xs whitespace-nowrap text-muted-foreground"
          >
            <Grid2x2 className="h-4 w-4" />
            {t("block.opacity")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 p-3"
          align="center"
          onCloseAutoFocus={(event) => event.preventDefault()}
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
              onPointerDown={(event) => event.stopPropagation()}
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
