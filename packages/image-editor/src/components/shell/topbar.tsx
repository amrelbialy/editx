import { Download, Loader2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useConfig } from "../../config/config-context";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { ZoomMenu } from "./zoom-menu";

interface TopbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onAutoFitPage?: () => void;
  onFitPage?: () => void;
  onFitSelection?: () => void;
  canFitSelection?: boolean;
  onZoomPreset?: (factor: number) => void;
  zoomLabel?: string;
  onExport?: () => void;
  /** Whether an export is currently in progress. */
  isExporting?: boolean;
  /** Slot: extra content rendered on the right side before export. */
  topbarRight?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onZoomIn,
  onZoomOut,
  onAutoFitPage,
  onFitPage,
  onFitSelection,
  canFitSelection = false,
  onZoomPreset,
  zoomLabel = "Auto",
  onExport,
  isExporting = false,
  topbarRight,
}) => {
  const config = useConfig();
  const title = config.ui?.title ?? "Photo Editor";
  const showTitle = config.ui?.showTitle ?? true;

  return (
    <div
      className={cn(
        "flex items-center justify-between h-12 px-3",
        "bg-card border-b border-border",
      )}
    >
      {/* Left: Undo / Redo */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Title */}
      {showTitle && <span className="text-sm font-medium text-muted-foreground">{title}</span>}

      {/* Right: Zoom + Export */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <ZoomMenu
          zoomLabel={zoomLabel}
          onAutoFitPage={onAutoFitPage}
          onFitPage={onFitPage}
          onFitSelection={onFitSelection}
          canFitSelection={canFitSelection}
          onZoomPreset={onZoomPreset}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
        <Button variant="ghost" size="icon" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        {topbarRight}
        <Button variant="default" size="sm" onClick={onExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? "Exporting…" : "Export Image"}
        </Button>
      </div>
    </div>
  );
};
