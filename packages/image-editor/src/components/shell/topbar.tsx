import { ArrowLeft, Download, Loader2, Redo2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import type React from "react";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
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

  // Segmented toolbar pill: bordered + shadowed group with dividers between buttons.
  const groupClass =
    "flex items-stretch overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-x divide-border";

  return (
    <div
      className={cn(
        "flex items-center justify-between h-10 px-2 @5xl/editor:h-12 @5xl/editor:px-3",
        "bg-card border-b border-border",
      )}
    >
      {/* Left: Close + Undo / Redo */}
      <div className="flex items-center gap-0.5 @5xl/editor:gap-1">
        {onClose && showCloseButton && (
          <>
            <IconButton
              className="h-8 w-8 @5xl/editor:h-9 @5xl/editor:w-9"
              onClick={onClose}
              label={showBackButton ? t("topbar.back") : t("topbar.close")}
              icon={
                showBackButton ? (
                  <ArrowLeft className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
                ) : (
                  <X className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
                )
              }
            />
            <Separator
              orientation="vertical"
              className="mx-0.5 h-5 @5xl/editor:mx-1 @5xl/editor:h-6"
            />
          </>
        )}
        <div className={groupClass}>
          <IconButton
            className="h-8 w-8 rounded-none @5xl/editor:h-9 @5xl/editor:w-9"
            onClick={onUndo}
            disabled={!canUndo}
            label={t("topbar.undo")}
            tooltip={`${t("topbar.undo")} (Ctrl+Z)`}
            aria-keyshortcuts="Control+Z"
            icon={<Undo2 className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />}
          />
          <IconButton
            className="h-8 w-8 rounded-none @5xl/editor:h-9 @5xl/editor:w-9"
            onClick={onRedo}
            disabled={!canRedo}
            label={t("topbar.redo")}
            tooltip={`${t("topbar.redo")} (Ctrl+Shift+Z)`}
            aria-keyshortcuts="Control+Shift+Z"
            icon={<Redo2 className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />}
          />
        </div>
      </div>

      {/* Center: Title — hidden on narrow containers to avoid crowding the toolbar */}
      {showTitle && (
        <span className="hidden truncate px-2 text-xs font-medium text-muted-foreground @xl/editor:inline @5xl/editor:text-sm">
          {title}
        </span>
      )}

      {/* Right: Zoom + Export */}
      <div className="flex items-center gap-0.5 @5xl/editor:gap-1">
        <div className={groupClass}>
          <IconButton
            className="h-8 w-8 rounded-none @5xl/editor:h-9 @5xl/editor:w-9"
            onClick={onZoomOut}
            label={t("topbar.zoomOut")}
            tooltip={`${t("topbar.zoomOut")} (-)`}
            icon={<ZoomOut className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />}
          />
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
          <IconButton
            className="h-8 w-8 rounded-none @5xl/editor:h-9 @5xl/editor:w-9"
            onClick={onZoomIn}
            label={t("topbar.zoomIn")}
            tooltip={`${t("topbar.zoomIn")} (+)`}
            icon={<ZoomIn className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />}
          />
        </div>
        <Separator orientation="vertical" className="mx-0.5 h-5 @5xl/editor:mx-1 @5xl/editor:h-6" />
        {topbarRight}
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs px-2 @sm/editor:px-2.5 @5xl/editor:h-8 @5xl/editor:px-3"
          onClick={onExport}
          disabled={isExporting}
          aria-busy={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin @5xl/editor:h-4 @5xl/editor:w-4" />
          ) : (
            <Download className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
          )}
          <span className="hidden @sm/editor:inline">
            {isExporting ? t("topbar.exporting") : t("topbar.export")}
          </span>
        </Button>
      </div>
    </div>
  );
};
