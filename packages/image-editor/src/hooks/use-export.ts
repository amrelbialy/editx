import type { EditxEngine } from "@editx/engine";
import { useCallback, useRef, useState } from "react";
import type { CloseReason, EditorEventCallbacks, ExportConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import type { EditorNotifications } from "./use-notifications";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOverrides {
  format?: ExportFormat;
  quality?: number;
}

export interface UseExportOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  exportConfig?: ExportConfig;
  onSave?: (blob: Blob) => void;
  onClose?: (reason?: CloseReason, hasUnsavedChanges?: boolean) => void;
  events?: EditorEventCallbacks;
  notify?: EditorNotifications;
}

const FORMAT_NAMES: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
};

export function useExport({
  engineRef,
  exportConfig,
  onSave,
  onClose,
  events,
  notify,
}: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  // Guard against double-click while an export is in progress
  const exportingRef = useRef(false);
  const markClean = useImageEditorStore((s) => s.markClean);

  const handleExport = useCallback(
    async (overrides?: ExportOverrides) => {
      const ce = engineRef.current;
      if (!ce || exportingRef.current) return;

      exportingRef.current = true;
      setIsExporting(true);

      try {
        const format = overrides?.format ?? exportConfig?.defaultFormat ?? "png";
        const quality = overrides?.quality ?? exportConfig?.quality ?? 0.92;

        let blob = await ce.exportScene({ format, quality });

        // Allow consumer to transform the blob before save
        if (events?.onBeforeSave) {
          const transformed = await events.onBeforeSave(blob);
          if (transformed) blob = transformed;
        }

        if (onSave) {
          onSave(blob);
        }

        markClean();
        notify?.success(`Exported as ${FORMAT_NAMES[format]}`);

        if (exportConfig?.closeAfterSave) {
          onClose?.("save", false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        notify?.error(message);
      } finally {
        exportingRef.current = false;
        setIsExporting(false);
      }
    },
    [engineRef, exportConfig, onSave, onClose, events, notify, markClean],
  );

  return { handleExport, isExporting };
}
