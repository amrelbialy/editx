import { ChevronUp, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface ZoomMenuProps {
  zoomLabel: string;
  onAutoFitPage?: () => void;
  onFitPage?: () => void;
  onFitSelection?: () => void;
  canFitSelection?: boolean;
  onZoomPreset?: (factor: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const ZoomMenu: React.FC<ZoomMenuProps> = ({
  zoomLabel,
  onAutoFitPage,
  onFitPage,
  onFitSelection,
  canFitSelection = false,
  onZoomPreset,
  onZoomIn,
  onZoomOut,
}) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs min-w-12 gap-0.5"
          title={t("zoom.options")}
        >
          {zoomLabel}
          <ChevronUp className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {/* Fit modes */}
        <DropdownMenuItem onClick={onAutoFitPage}>{t("zoom.autoFit")}</DropdownMenuItem>
        <DropdownMenuItem onClick={onFitPage}>{t("zoom.fitPage")}</DropdownMenuItem>
        <DropdownMenuItem onClick={onFitSelection} disabled={!canFitSelection}>
          {t("zoom.fit")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Zoom presets */}
        <DropdownMenuItem onClick={() => onZoomPreset?.(2)}>200% Zoom</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onZoomPreset?.(1)}>
          <span className="flex-1">100% Zoom</span>
          <kbd className="ml-auto text-xs text-muted-foreground">⇧2</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onZoomPreset?.(0.5)}>50% Zoom</DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Zoom in/out */}
        <DropdownMenuItem onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4 mr-2" />
          <span className="flex-1">{t("zoom.in")}</span>
          <kbd className="ml-auto text-xs text-muted-foreground">+</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4 mr-2" />
          <span className="flex-1">{t("zoom.out")}</span>
          <kbd className="ml-auto text-xs text-muted-foreground">-</kbd>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
