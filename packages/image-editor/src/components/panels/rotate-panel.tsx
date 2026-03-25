import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react";
import type React from "react";
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
  return (
    <div className="flex flex-col gap-4">
      {/* Straighten */}
      <SliderField
        label="Straighten"
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
        <div className="text-base font-medium text-muted-foreground mb-2">Rotate</div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onRotateCounterClockwise}
            data-testid="rotate-ccw"
            aria-label="Rotate 90° counter-clockwise"
            title="Rotate 90° counter-clockwise"
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
            aria-label="Rotate 90° clockwise"
            title="Rotate 90° clockwise"
          >
            <RotateCw className="h-4 w-4" />
            +90°
          </Button>
        </div>
      </div>

      <Separator />

      {/* Flip buttons */}
      <div>
        <div className="text-base font-medium text-muted-foreground mb-2">Flip</div>
        <div className="flex gap-1.5">
          <Button
            variant={flipH ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipHorizontal}
            data-testid="flip-h"
            aria-label="Flip horizontally"
            aria-pressed={flipH}
            title="Flip horizontally"
          >
            <FlipHorizontal className="h-4 w-4" />
            Horizontal
          </Button>
          <Button
            variant={flipV ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipVertical}
            data-testid="flip-v"
            aria-label="Flip vertically"
            aria-pressed={flipV}
            title="Flip vertically"
          >
            <FlipVertical className="h-4 w-4" />
            Vertical
          </Button>
        </div>
      </div>
    </div>
  );
};
