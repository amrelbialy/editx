import type { CreativeEngine } from "@creative-editor/engine";
import { useCallback, useRef, useState } from "react";
import type { EditorEventCallbacks, ExportConfig } from "../config/config.types";
import type { EditorNotifications } from "./use-notifications";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOverrides {
  format?: ExportFormat;
  quality?: number;
}

export interface UseExportOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  exportConfig?: ExportConfig;
  onSave?: (blob: Blob) => void;
  events?: EditorEventCallbacks;
  notify?: EditorNotifications;
}

const FORMAT_NAMES: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
};

export function useExport({ engineRef, exportConfig, onSave, events, notify }: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  // Guard against double-click while an export is in progress
  const exportingRef = useRef(false);

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

        notify?.success(`Exported as ${FORMAT_NAMES[format]}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        notify?.error(message);
      } finally {
        exportingRef.current = false;
        setIsExporting(false);
      }
    },
    [engineRef, exportConfig, onSave, events, notify],
  );

  return { handleExport, isExporting };
}
