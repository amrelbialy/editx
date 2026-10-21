import type { EditxEngine } from "@editx/engine";
import { useCallback, useRef, useState } from "react";
import type { CloseReason, EditorEventCallbacks, ExportConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { downloadBlob } from "../utils/download-blob";
import { watchExportDocument } from "../utils/export-document-guard";
import { exportPages, type PageExportTarget } from "../utils/export-pages";
import type { EditorNotifications } from "./use-notifications";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOverrides {
  format?: ExportFormat;
  quality?: number;
  pages?: PageExportTarget;
}

export interface UseExportOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  exportConfig?: ExportConfig;
  onSave?: (blob: Blob) => void;
  onClose?: (reason?: CloseReason, hasUnsavedChanges?: boolean) => void;
  events?: EditorEventCallbacks;
  notify?: EditorNotifications;
  /** Fallback base filename for the built-in download when `onSave` is absent. */
  defaultFilename?: string;
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
  defaultFilename,
}: UseExportOptions) {
  const exportingRef = useRef(false);

  const markClean = useImageEditorStore((s) => s.markClean);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (overrides?: ExportOverrides) => {
      const ce = engineRef.current;
      if (exportingRef.current) return false;
      if (!ce) {
        notify?.error("The editor is not ready for export.");
        return false;
      }

      exportingRef.current = true;
      setIsExporting(true);
      let guard: ReturnType<typeof watchExportDocument> | undefined;

      try {
        guard = watchExportDocument(ce);
        const target = overrides?.pages;
        const pageIds = target ? ce.scene.getPages() : [];
        const coversDocument =
          !target ||
          target.mode === "all" ||
          (target.mode === "current"
            ? pageIds.length === 1
            : pageIds.every((id) => target.ids.includes(id)));
        const format = overrides?.format ?? exportConfig?.defaultFormat ?? "png";
        const quality = overrides?.quality ?? exportConfig?.quality ?? 0.92;

        let blob = overrides?.pages
          ? await exportPages(ce, overrides.pages, { format, quality })
          : await ce.exportScene({ format, quality });
        guard.assertCurrent();

        // Allow consumer to transform the blob before save
        if (events?.onBeforeSave) {
          const transformed = await events.onBeforeSave(blob);
          if (transformed) blob = transformed;
        }
        guard.assertCurrent();
        if (engineRef.current !== ce)
          throw new Error("The editor changed during export. Please try again.");

        if (onSave) {
          await onSave(blob);
        } else {
          // No consumer handler: fall back to a browser download so the
          // built-in Export action works out of the box.
          downloadBlob(blob, exportConfig?.filename ?? defaultFilename);
        }

        const savedWholeDocument = coversDocument && engineRef.current === ce && !guard.changed;
        if (savedWholeDocument) markClean();
        notify?.success(
          overrides?.pages && overrides.pages.mode !== "current"
            ? "Exported pages as ZIP"
            : `Exported as ${FORMAT_NAMES[format]}`,
        );

        if (exportConfig?.closeAfterSave && savedWholeDocument) {
          onClose?.("save", false);
        }
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        notify?.error(message);
        return false;
      } finally {
        guard?.dispose();
        exportingRef.current = false;
        setIsExporting(false);
      }
    },
    [engineRef, exportConfig, onSave, onClose, events, notify, markClean, defaultFilename],
  );

  return { handleExport, isExporting };
}
