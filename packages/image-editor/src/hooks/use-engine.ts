import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreativeEngine,
  evictImage,
} from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';
import { loadImage, sourceToUrl, revokeObjectUrl } from '../utils/load-image';
import { validateImageFile, validateImageDimensions, type ImageValidationOptions } from '../utils/validate-image';
import { downscaleIfNeeded } from '../utils/downscale-image';
import { correctOrientation } from '../utils/correct-orientation';
import { isSameSource } from '../utils/is-same-source';
import { extractFilename } from '../utils/extract-filename';
import type { ImageSource } from '../image-editor';

/**
 * Convert any supported source type to a URL string.
 */
function resolveSourceToUrl(source: ImageSource): string {
  if (typeof source === 'string') return sourceToUrl(source);
  if (source instanceof File || source instanceof Blob) return sourceToUrl(source);
  if (source instanceof HTMLCanvasElement) return source.toDataURL();
  if (source instanceof HTMLImageElement) return source.src;
  return sourceToUrl(source as string);
}

/**
 * For HTMLImageElement sources that may not yet be loaded, wait for the load event.
 */
function ensureImageReady(source: ImageSource): Promise<void> {
  if (source instanceof HTMLImageElement && !source.complete) {
    return new Promise((resolve, reject) => {
      source.addEventListener('load', () => resolve(), { once: true });
      source.addEventListener('error', () => reject(new Error('HTMLImageElement failed to load')), { once: true });
    });
  }
  return Promise.resolve();
}

/**
 * Extract the raw URL string from a source for identity comparison.
 * Does NOT create blob URLs — purely reads existing URLs.
 */
function getSourceIdentity(source: ImageSource): string | null {
  if (typeof source === 'string') return source;
  if (source instanceof HTMLImageElement) return source.src || null;
  return null;
}

export interface UseEngineOptions {
  src: ImageSource;
  validation?: ImageValidationOptions;
  keepZoomOnSourceChange?: boolean;
}

export interface UseEngineResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  engine: CreativeEngine | null;
  engineRef: React.RefObject<CreativeEngine | null>;
  initEditor: (source: ImageSource, signal?: { disposed: boolean }) => Promise<void>;
  handleRetry: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  selectedShapeId: number | null;
  setSelectedShapeId: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useEngine({ src, validation, keepZoomOnSourceChange = false }: UseEngineOptions): UseEngineResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [engine, setEngine] = useState<CreativeEngine | null>(null);

  const loadedSourceRef = useRef<ImageSource | null>(null);
  const loadingSourceIdentityRef = useRef<string | null>(null);

  const setOriginalImage = useImageEditorStore((s) => s.setOriginalImage);
  const setLoading = useImageEditorStore((s) => s.setLoading);
  const setEditableBlockId = useImageEditorStore((s) => s.setEditableBlockId);
  const setError = useImageEditorStore((s) => s.setError);
  const clearError = useImageEditorStore((s) => s.clearError);
  const setShownImageDimensions = useImageEditorStore((s) => s.setShownImageDimensions);

  const currentSrcRef = useRef<ImageSource>(src);
  currentSrcRef.current = src;

  const prevZoomRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

  const cleanupBlobUrl = useCallback(() => {
    const url = blobUrlRef.current;
    if (url) {
      evictImage(url);
      revokeObjectUrl(url);
      blobUrlRef.current = null;
    }
  }, []);

  const initEditor = useCallback(async (source: ImageSource, signal?: { disposed: boolean }) => {
    if (!containerRef.current) return;

    if (isSameSource(source, loadedSourceRef.current) && engineRef.current) {
      return;
    }

    const identity = getSourceIdentity(source);
    if (identity && identity === loadingSourceIdentityRef.current) {
      return;
    }
    loadingSourceIdentityRef.current = identity;

    if (keepZoomOnSourceChange && engineRef.current) {
      prevZoomRef.current = {
        zoom: engineRef.current.editor.getZoom(),
        pan: engineRef.current.editor.getPan(),
      };
    } else {
      prevZoomRef.current = null;
    }

    engineRef.current?.dispose();
    engineRef.current = null;
    setEngine(null);
    cleanupBlobUrl();
    loadedSourceRef.current = null;

    const prevOriginal = useImageEditorStore.getState().originalImage;
    const isSameUrl = prevOriginal && identity && prevOriginal.src === identity;
    if (!isSameUrl) {
      setLoading(true);
    }
    clearError();

    try {
      if (source instanceof File || source instanceof Blob) {
        const fileResult = validateImageFile(source, validation);
        if (!fileResult.valid) {
          throw new Error(fileResult.error);
        }
        for (const w of fileResult.warnings) {
          console.warn(`[creative-editor] ${w}`);
        }
      }

      let processedSource: ImageSource = source;
      if (source instanceof File || source instanceof Blob) {
        try {
          const corrected = await correctOrientation(source);
          processedSource = corrected.canvas;
        } catch {
          processedSource = source;
        }
      }

      await ensureImageReady(processedSource);

      const imgUrl = resolveSourceToUrl(processedSource);
      if (imgUrl.startsWith('blob:')) {
        blobUrlRef.current = imgUrl;
      }
      if (signal?.disposed) return;

      const htmlImg = await loadImage(imgUrl);
      if (signal?.disposed) return;

      const dimResult = validateImageDimensions(
        htmlImg.naturalWidth,
        htmlImg.naturalHeight,
        validation,
      );
      if (!dimResult.valid) {
        throw new Error(dimResult.error);
      }
      for (const w of dimResult.warnings) {
        console.warn(`[creative-editor] ${w}`);
      }

      const scaled = downscaleIfNeeded(htmlImg);
      let workingUrl = imgUrl;
      let workingWidth = htmlImg.naturalWidth;
      let workingHeight = htmlImg.naturalHeight;

      if (scaled.wasDownscaled) {
        workingUrl = scaled.dataUrl;
        workingWidth = scaled.workingWidth;
        workingHeight = scaled.workingHeight;
        await loadImage(workingUrl);
      }

      if (signal?.disposed) return;

      const name = extractFilename(source);

      setOriginalImage({
        src: imgUrl,
        width: htmlImg.naturalWidth,
        height: htmlImg.naturalHeight,
        name,
      });

      const ce = await CreativeEngine.create({
        container: containerRef.current!,
      });
      if (signal?.disposed) return;

      engineRef.current = ce;

      await ce.scene.create({ width: workingWidth, height: workingHeight });

      const pageId = ce.scene.getCurrentPage();
      if (pageId === null) return;

      ce.block.setPageImageSrc(pageId, workingUrl);
      ce.block.setPageImageOriginalDimensions(pageId, workingWidth, workingHeight);

      setEditableBlockId(pageId);

      if (prevZoomRef.current) {
        ce.editor.setZoom(prevZoomRef.current.zoom);
        ce.editor.panTo(prevZoomRef.current.pan.x, prevZoomRef.current.pan.y);
        prevZoomRef.current = null;
      }

      const zoom = ce.editor.getZoom();
      setShownImageDimensions({
        width: workingWidth * zoom,
        height: workingHeight * zoom,
        scale: zoom,
      });

      loadedSourceRef.current = source;
      loadingSourceIdentityRef.current = null;
      setLoading(false);
      setEngine(ce);

      ce.on('selection:changed', (ids: number[]) => {
        if (ids.length === 1 && ce.block.getType(ids[0]) === 'graphic') {
          setSelectedShapeId(ids[0]);
          return;
        }
        setSelectedShapeId(null);
      });
    } catch (err) {
      if (signal?.disposed) return;
      loadingSourceIdentityRef.current = null;
      const message = err instanceof Error ? err.message : 'Failed to load image';
      console.error('[creative-editor] Init error:', message);

      if (typeof source === 'object' && source !== null && 'width' in source && 'height' in source) {
        const obj = source as unknown as { width: number; height: number; src?: string };
        if (obj.width && obj.height) {
          setOriginalImage({
            src: '',
            width: obj.width,
            height: obj.height,
            name: extractFilename(source),
          });
        }
      }

      setError(message);
      setLoading(false);
    }
  }, [setOriginalImage, setLoading, setEditableBlockId, setError, clearError, cleanupBlobUrl, setShownImageDimensions, validation, keepZoomOnSourceChange]);

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

  const handleRetry = useCallback(() => {
    loadedSourceRef.current = null;
    loadingSourceIdentityRef.current = null;
    initEditor(currentSrcRef.current);
  }, [initEditor]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadedSourceRef.current = null;
      initEditor(file);
      return;
    }

    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
      initEditor(url);
    }
  }, [initEditor]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          loadedSourceRef.current = null;
          initEditor(blob);
          return;
        }
      }
    }
  }, [initEditor]);

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
