import { type EditxEngine, evictImage } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSource } from "../../image-editor";
import { useImageEditorStore } from "../../store/image-editor-store";
import { revokeObjectUrl } from "../../utils/load-image";
import { runInit } from "./init-editor";
import type {
  InitContext,
  UseEngineOptions,
  UseEngineResult,
  ZoomSnapshot,
} from "./use-engine.types";
import { useSourceDropHandlers } from "./use-source-drop-handlers";

export type { UseEngineOptions, UseEngineResult } from "./use-engine.types";

export function useEngine({
  src,
  validation,
  keepZoomOnSourceChange = false,
}: UseEngineOptions): UseEngineResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EditxEngine | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadedSourceRef = useRef<ImageSource | null>(null);
  const loadingSourceIdentityRef = useRef<string | null>(null);
  const currentSrcRef = useRef<ImageSource>(src);
  currentSrcRef.current = src;
  const prevZoomRef = useRef<ZoomSnapshot | null>(null);

  const setOriginalImage = useImageEditorStore((s) => s.setOriginalImage);
  const setLoading = useImageEditorStore((s) => s.setLoading);
  const setEditableBlockId = useImageEditorStore((s) => s.setEditableBlockId);
  const setError = useImageEditorStore((s) => s.setError);
  const clearError = useImageEditorStore((s) => s.clearError);
  const setShownImageDimensions = useImageEditorStore((s) => s.setShownImageDimensions);

  const [engine, setEngine] = useState<EditxEngine | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

  const cleanupBlobUrl = useCallback(() => {
    const url = blobUrlRef.current;
    if (url) {
      evictImage(url);
      revokeObjectUrl(url);
      blobUrlRef.current = null;
    }
  }, []);

  const initEditor = useCallback(
    async (source: ImageSource, signal?: { disposed: boolean }) => {
      const ctx: InitContext = {
        containerRef,
        engineRef,
        blobUrlRef,
        loadedSourceRef,
        loadingSourceIdentityRef,
        prevZoomRef,
        setEngine,
        setSelectedShapeId,
        cleanupBlobUrl,
        setOriginalImage,
        setLoading,
        setEditableBlockId,
        setError,
        clearError,
        setShownImageDimensions,
        validation,
        keepZoomOnSourceChange,
      };
      await runInit(ctx, source, signal);
    },
    [
      setOriginalImage,
      setLoading,
      setEditableBlockId,
      setError,
      clearError,
      cleanupBlobUrl,
      setShownImageDimensions,
      validation,
      keepZoomOnSourceChange,
    ],
  );

  // Consumes `initEditor`, so it sits after the callbacks rather than in the
  // custom-hook group above.
  const { handleRetry, handleDragOver, handleDrop, handlePaste } = useSourceDropHandlers({
    initEditor,
    loadedSourceRef,
    loadingSourceIdentityRef,
    currentSrcRef,
  });

  useEffect(() => {
    const signal = { disposed: false };
    initEditor(src, signal);

    return () => {
      signal.disposed = true;
      cleanupBlobUrl();
      engineRef.current?.dispose();
      engineRef.current = null;
      loadedSourceRef.current = null;
      loadingSourceIdentityRef.current = null;
    };
  }, [src, initEditor, cleanupBlobUrl]);

  return {
    containerRef,
    engine,
    engineRef,
    initEditor,
    handleRetry,
    handleDragOver,
    handleDrop,
    handlePaste,
    selectedShapeId,
    setSelectedShapeId,
  };
}
