import { ArrowLeft, Download, Loader2, Redo2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
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
  /** Called when the close/back button is clicked. */
  onClose?: () => void;
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
  onClose,
}) => {
  const config = useConfig();
  const { t } = useTranslation();

  const title = config.ui?.title ?? t("topbar.title");
  const showTitle = config.ui?.showTitle ?? true;
  const showCloseButton = config.ui?.showCloseButton ?? !!onClose;
  const showBackButton = config.ui?.showBackButton ?? false;

  return (
    <div
      className={cn(
        "flex items-center justify-between h-12 px-3",
        "bg-card border-b border-border",
      )}
    >
      {/* Left: Close + Undo / Redo */}
      <div className="flex items-center gap-1">
        {onClose && showCloseButton && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={showBackButton ? t("topbar.back") : t("topbar.close")}
              title={showBackButton ? t("topbar.back") : t("topbar.close")}
            >
              {showBackButton ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t("topbar.undo")}
          aria-keyshortcuts="Control+Z"
          title={`${t("topbar.undo")} (Ctrl+Z)`}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t("topbar.redo")}
          aria-keyshortcuts="Control+Shift+Z"
          title={`${t("topbar.redo")} (Ctrl+Shift+Z)`}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Title */}
      {showTitle && <span className="text-sm font-medium text-muted-foreground">{title}</span>}

      {/* Right: Zoom + Export */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          aria-label={t("topbar.zoomOut")}
          title={`${t("topbar.zoomOut")} (-)`}
        >
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          aria-label={t("topbar.zoomIn")}
          title={`${t("topbar.zoomIn")} (+)`}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        {topbarRight}
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          aria-busy={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? t("topbar.exporting") : t("topbar.export")}
        </Button>
      </div>
    </div>
  );
};
