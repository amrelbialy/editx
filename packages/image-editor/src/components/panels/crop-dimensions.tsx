import { Link, Unlink } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";

export interface CropDimensionsProps {
  width: number;
  height: number;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  ratioLocked: boolean;
  /** When omitted, the ratio-lock toggle is hidden and the ratio stays fixed. */
  onToggleRatioLock?: () => void;
}

/** Crop-area width/height inputs with the optional ratio-lock bracket. */
export const CropDimensions: React.FC<CropDimensionsProps> = (props) => {
  const { width, height, onWidthChange, onHeightChange, ratioLocked, onToggleRatioLock } = props;

  const { t } = useTranslation();

  return (
    <div>
      <div className="text-fluid font-medium text-muted-foreground mb-2">Crop Area</div>
      <div className="flex items-stretch gap-1.5">
        <div className="flex-1 flex flex-col gap-2">
          <Input
            type="number"
            min={1}
            label={t("crop.width")}
            labelClassName="w-12"
            suffix="px"
            value={width || ""}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            data-testid="resize-width-input"
          />
          <Input
            type="number"
            min={1}
            label={t("crop.height")}
            labelClassName="w-12"
            suffix="px"
            value={height || ""}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            data-testid="resize-height-input"
          />
        </div>

        {onToggleRatioLock && (
          <div className="relative flex shrink-0 items-center">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-0 top-1/4 bottom-1/4 w-2 rounded-r-md border-y border-r transition-colors",
                ratioLocked ? "border-primary" : "border-border",
              )}
            />
            <IconButton
              label={ratioLocked ? t("crop.unlockRatio") : t("crop.lockRatio")}
              icon={
                ratioLocked ? (
                  <Link className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                ) : (
                  <Unlink className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                )
              }
              tooltipSide="left"
              onClick={onToggleRatioLock}
              aria-pressed={ratioLocked}
              data-testid="resize-ratio-lock"
              className={cn("ml-2", ratioLocked ? "text-primary" : "text-muted-foreground")}
            />
          </div>
        )}
      </div>
    </div>
  );
};
