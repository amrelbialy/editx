import { Download, Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { useConfig } from "../../config/config-context";
import type { ExportFormat, ExportOverrides } from "../../hooks/use-export";
import { useExportPages } from "../../hooks/use-export-pages";
import { useTranslation } from "../../i18n/i18n-context";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SliderField } from "../ui/slider-field";
import { ExportPageSelector } from "./export-page-selector";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
};

interface ExportDialogProps {
  engine: EditxEngine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (overrides: ExportOverrides) => Promise<boolean>;
  isExporting: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = (props) => {
  const { engine, open, onOpenChange, onExport, isExporting } = props;

  const config = useConfig();
  const { t } = useTranslation();
  const pageSelection = useExportPages(engine, open, !!config.ui?.pageNavigation);

  const exportConfig = config.export;
  const availableFormats = exportConfig?.formats ?? ["png", "jpeg", "webp"];
  const defaultFormat = exportConfig?.defaultFormat ?? "png";
  const defaultQuality = exportConfig?.quality ?? 0.92;

  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [quality, setQuality] = useState(defaultQuality);

  const showQuality = format === "jpeg" || format === "webp";

  const handleExport = useCallback(async () => {
    const success = await onExport({
      format,
      quality: showQuality ? quality : undefined,
      pages: pageSelection.target,
    });
    if (success) onOpenChange(false);
  }, [onExport, format, quality, showQuality, onOpenChange, pageSelection.target]);

  const formatQuality = useCallback((v: number): string => `${Math.round(v * 100)}%`, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isExporting) onOpenChange(next);
      }}
    >
      <DialogContent className="w-sm @3xl/editor:w-md">
        <DialogHeader>
          <DialogTitle>
            {config.ui?.pageNavigation ? t("pages.exportTitle") : "Export Image"}
          </DialogTitle>
          <DialogDescription>
            Choose the format and quality for your exported image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4" inert={isExporting}>
          {config.ui?.pageNavigation && (
            <ExportPageSelector selection={pageSelection} disabled={isExporting} />
          )}
          {/* Format selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-fluid font-medium text-muted-foreground">Format</span>
            <Select
              value={format}
              disabled={isExporting}
              onValueChange={(v) => {
                if (v === "png" || v === "jpeg" || v === "webp") setFormat(v);
              }}
            >
              <SelectTrigger aria-label="Format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFormats.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality slider (JPEG/WebP only) */}
          {showQuality && (
            <SliderField
              label="Quality"
              value={quality}
              min={0.1}
              max={1}
              step={0.05}
              onChange={setQuality}
              formatValue={formatQuality}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !pageSelection.canExport}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exporting…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import type { EditxEngine } from "@editx/engine";
