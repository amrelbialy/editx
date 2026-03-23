import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react";
import type React from "react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";

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
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Straighten</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(rotation)}°
          </span>
        </div>
        <Slider
          min={-180}
          max={180}
          step={1}
          value={[rotation]}
          onValueChange={([v]) => onRotationChange(v)}
          data-testid="rotation-slider"
        />
      </div>

      <Separator />

      {/* 90° rotation buttons */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Rotate</div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onRotateCounterClockwise}
            data-testid="rotate-ccw"
            title="Rotate 90° counter-clockwise"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            −90°
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onRotateClockwise}
            data-testid="rotate-cw"
            title="Rotate 90° clockwise"
          >
            <RotateCw className="h-3.5 w-3.5" />
            +90°
          </Button>
        </div>
      </div>

      <Separator />

      {/* Flip buttons */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Flip</div>
        <div className="flex gap-1.5">
          <Button
            variant={flipH ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipHorizontal}
            data-testid="flip-h"
            title="Flip horizontally"
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
            Horizontal
          </Button>
          <Button
            variant={flipV ? "default" : "secondary"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onFlipVertical}
            data-testid="flip-v"
            title="Flip vertically"
          >
            <FlipVertical className="h-3.5 w-3.5" />
            Vertical
          </Button>
        </div>
      </div>
    </div>
  );
};
