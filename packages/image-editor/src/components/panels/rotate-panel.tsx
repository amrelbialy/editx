import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";

export interface RotatePanelProps {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  onRotationChange: (angle: number) => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onReset: () => void;
}

export const RotatePanel: React.FC<RotatePanelProps> = ({
  rotation,
  flipH,
  flipV,
  onRotationChange,
  onRotateClockwise,
  onRotateCounterClockwise,
  onFlipHorizontal,
  onFlipVertical,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {/* Straighten */}
      <SliderField
        label={t("rotate.straighten")}
        value={rotation}
        min={-180}
        max={180}
        step={1}
        onChange={onRotationChange}
        formatValue={(v) => `${Math.round(v)}°`}
        data-testid="rotation-slider"
      />

      <Separator />

      {/* 90° rotation buttons */}
      <div>
        <div className="text-base font-medium text-muted-foreground mb-2">{t("rotate.rotate")}</div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onRotateCounterClockwise}
            data-testid="rotate-ccw"
            aria-label={t("rotate.ccw")}
            title={t("rotate.ccw")}
          >
            <RotateCcw className="h-4 w-4" />
            −90°
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onRotateClockwise}
            data-testid="rotate-cw"
            aria-label={t("rotate.cw")}
            title={t("rotate.cw")}
          >
            <RotateCw className="h-4 w-4" />
            +90°
          </Button>
        </div>
      </div>

      <Separator />

      {/* Flip buttons */}
      <div>
        <div className="text-base font-medium text-muted-foreground mb-2">{t("rotate.flip")}</div>
        <div className="flex gap-1.5">
          <Button
            variant={flipH ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipHorizontal}
            data-testid="flip-h"
            aria-label={t("rotate.flipH")}
            aria-pressed={flipH}
            title={t("rotate.flipH")}
          >
            <FlipHorizontal className="h-4 w-4" />
            {t("rotate.horizontal")}
          </Button>
          <Button
            variant={flipV ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipVertical}
            data-testid="flip-v"
            aria-label={t("rotate.flipV")}
            aria-pressed={flipV}
            title={t("rotate.flipV")}
          >
            <FlipVertical className="h-4 w-4" />
            {t("rotate.vertical")}
          </Button>
        </div>
      </div>
    </div>
  );
};
