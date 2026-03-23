import type { CreativeEngine } from "@creative-editor/engine";
import { useCallback, useRef, useState } from "react";
import type { EditorEventCallbacks, ExportConfig } from "../config/config.types";

export interface UseExportOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  exportConfig?: ExportConfig;
  onSave?: (blob: Blob) => void;
  events?: EditorEventCallbacks;
}

export function useExport({ engineRef, exportConfig, onSave, events }: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  // Guard against double-click while an export is in progress
  const exportingRef = useRef(false);

  const handleExport = useCallback(async () => {
    const ce = engineRef.current;
    if (!ce || exportingRef.current) return;

    exportingRef.current = true;
    setIsExporting(true);

    try {
      const format = exportConfig?.defaultFormat ?? "png";
      const quality = exportConfig?.quality ?? 0.92;

      let blob = await ce.exportScene({ format, quality });

      // Allow consumer to transform the blob before save
      if (events?.onBeforeSave) {
        const transformed = await events.onBeforeSave(blob);
        if (transformed) blob = transformed;
      }

      if (onSave) {
        onSave(blob);
      }
    } catch (err) {
      console.error("[useExport] Export failed:", err);
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }, [engineRef, exportConfig, onSave, events]);

  return { handleExport, isExporting };
}
