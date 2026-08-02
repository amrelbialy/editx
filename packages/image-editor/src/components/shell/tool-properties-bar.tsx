import {
  Check,
  FlipHorizontal,
  FlipVertical,
  RotateCcw as ResetIcon,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { IconButton } from "../ui/icon-button";
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
  /** Gate the rotate/flip cluster (crop/rotate tools). Default: true. */
  showRotateFlip?: boolean;
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
  showRotateFlip = true,
}) => {
  const isCrop = activeTool === "crop";
  const isRotate = activeTool === "rotate";
  const showRotateFlipCluster = (isCrop || isRotate) && showRotateFlip;
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-1 h-10 px-3",
        "bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg",
        "animate-in fade-in-0 slide-in-from-top-1 duration-150",
      )}
    >
      {/* Rotate/flip actions for crop & rotate tools */}
      {showRotateFlipCluster && (
        <>
          <IconButton
            onClick={onRotateCounterClockwise}
            label={t("bar.rotateLeft")}
            icon={<RotateCcw className="h-4 w-4" />}
          />
          <IconButton
            onClick={onRotateClockwise}
            label={t("bar.rotateRight")}
            icon={<RotateCw className="h-4 w-4" />}
          />
          <Separator orientation="vertical" className="h-5 mx-0.5" />
          <IconButton
            onClick={onFlipHorizontal}
            label={t("bar.flipH")}
            icon={<FlipHorizontal className="h-4 w-4" />}
          />
          <IconButton
            onClick={onFlipVertical}
            label={t("bar.flipV")}
            icon={<FlipVertical className="h-4 w-4" />}
          />

          <Separator orientation="vertical" className="h-5 mx-1" />
        </>
      )}

      {/* Custom tool content */}
      {customContent}

      {/* Reset + Done (always present) */}
      <div className="flex items-center gap-1">
        {onReset && (
          <IconButton
            onClick={onReset}
            label={t("bar.reset")}
            icon={<ResetIcon className="h-4 w-4" />}
          />
        )}
        {onDone && (
          <IconButton
            onClick={onDone}
            variant="default"
            label={t("bar.done")}
            icon={<Check className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  );
};
