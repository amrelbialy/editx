import type React from "react";
import { useCallback } from "react";
import type { ImageSource } from "../../image-editor";

interface UseSourceDropHandlersOptions {
  initEditor: (source: ImageSource, signal?: { disposed: boolean }) => Promise<void>;
  loadedSourceRef: React.RefObject<ImageSource | null>;
  loadingSourceIdentityRef: React.RefObject<string | null>;
  currentSrcRef: React.RefObject<ImageSource>;
}

/**
 * Drag/drop/paste/retry source handlers for the editor container. Kept separate
 * from `useEngine` so the init orchestration stays focused.
 */
export function useSourceDropHandlers(options: UseSourceDropHandlersOptions) {
  const { initEditor, loadedSourceRef, loadingSourceIdentityRef, currentSrcRef } = options;

  const handleRetry = useCallback(() => {
    loadedSourceRef.current = null;
    loadingSourceIdentityRef.current = null;
    initEditor(currentSrcRef.current);
  }, [initEditor, loadedSourceRef, loadingSourceIdentityRef, currentSrcRef]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) {
        loadedSourceRef.current = null;
        initEditor(file);
        return;
      }

      const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (
        url &&
        (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"))
      ) {
        initEditor(url);
      }
    },
    [initEditor, loadedSourceRef],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            loadedSourceRef.current = null;
            initEditor(blob);
            return;
          }
        }
      }
    },
    [initEditor, loadedSourceRef],
  );

  return { handleRetry, handleDragOver, handleDrop, handlePaste };
}
