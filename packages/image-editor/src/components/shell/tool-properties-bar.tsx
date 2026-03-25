import {
  Check,
  FlipHorizontal,
  FlipVertical,
  RotateCcw as ResetIcon,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type React from "react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

interface ToolPropertiesBarProps {
  activeTool: string;
  onReset?: () => void;
  onDone?: () => void;
  // Rotate/flip actions (shared by crop + rotate)
  onRotateClockwise?: () => void;
  onRotateCounterClockwise?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  // Custom tool bar content
  customContent?: React.ReactNode;
}

export const ToolPropertiesBar: React.FC<ToolPropertiesBarProps> = ({
  activeTool,
  onReset,
  onDone,
  onRotateClockwise,
  onRotateCounterClockwise,
  onFlipHorizontal,
  onFlipVertical,
  customContent,
}) => {
  const isCrop = activeTool === "crop";
  const isRotate = activeTool === "rotate";
  const showRotateFlip = isCrop || isRotate;

  return (
    <div
      className={cn(
        "flex items-center gap-1 h-10 px-3",
        "bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
        "animate-in fade-in-0 slide-in-from-top-1 duration-150",
      )}
    >
      {/* Rotate/flip actions for crop & rotate tools */}
      {showRotateFlip && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRotateCounterClockwise}
            aria-label="Rotate 90° left"
            title="Rotate 90° left"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRotateClockwise}
            aria-label="Rotate 90° right"
            title="Rotate 90° right"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFlipHorizontal}
            aria-label="Flip horizontal"
            title="Flip horizontal"
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFlipVertical}
            aria-label="Flip vertical"
            title="Flip vertical"
          >
            <FlipVertical className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />
        </>
      )}

      {/* Custom tool content */}
      {customContent}

      {/* Reset + Done (always present) */}
      <div className="flex items-center gap-1">
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1 h-7 text-xs rounded-md"
          >
            <ResetIcon className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
        {onDone && (
          <Button
            variant="default"
            size="sm"
            onClick={onDone}
            className="gap-1 h-7 text-xs rounded-full"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
};
