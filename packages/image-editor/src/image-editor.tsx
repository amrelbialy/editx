import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CreativeEngine, IMAGE_SRC, evictImage } from '@creative-editor/engine';
import { useImageEditorStore } from './store/image-editor-store';
import { loadImage, sourceToUrl, revokeObjectUrl } from './utils/load-image';
import { validateImageFile, validateImageDimensions, type ImageValidationOptions } from './utils/validate-image';
import { downscaleIfNeeded } from './utils/downscale-image';
import { correctOrientation } from './utils/correct-orientation';
import { ImageEditorToolbar } from './components/toolbar';

export type ImageSource = string | File | Blob | HTMLImageElement | HTMLCanvasElement;

export interface ImageEditorProps {
  src: ImageSource;
  onSave?: (blob: Blob) => void;
  width?: string | number;
  height?: string | number;
  /** Validation options for file type, size, and dimension limits. */
  validation?: ImageValidationOptions;
}

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

export const ImageEditor: React.FC<ImageEditorProps> = ({
  src,
  onSave,
  width = '100%',
  height = '100vh',
  validation,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [engine, setEngine] = useState<CreativeEngine | null>(null);

  const setOriginalImage = useImageEditorStore((s) => s.setOriginalImage);
  const setLoading = useImageEditorStore((s) => s.setLoading);
  const setImageBlockId = useImageEditorStore((s) => s.setImageBlockId);
  const setError = useImageEditorStore((s) => s.setError);
  const clearError = useImageEditorStore((s) => s.clearError);
  const isLoading = useImageEditorStore((s) => s.isLoading);
  const error = useImageEditorStore((s) => s.error);

  // Track current source to allow re-init on change
  const currentSrcRef = useRef<ImageSource>(src);
  currentSrcRef.current = src;

  /** Clean up a previously created blob URL and its cache entry. */
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

    // Clean up previous engine and blob URL
    engineRef.current?.dispose();
    engineRef.current = null;
    setEngine(null);
    cleanupBlobUrl();

    setLoading(true);
    clearError();

    try {
      // Validate File/Blob before loading
      if (source instanceof File || source instanceof Blob) {
        const fileResult = validateImageFile(source, validation);
        if (!fileResult.valid) {
          throw new Error(fileResult.error);
        }
        for (const w of fileResult.warnings) {
          console.warn(`[creative-editor] ${w}`);
        }
      }

      // EXIF orientation correction for File/Blob
      let processedSource: ImageSource = source;
      if (source instanceof File || source instanceof Blob) {
        try {
          const corrected = await correctOrientation(source);
          processedSource = corrected.canvas;
        } catch {
          // If createImageBitmap fails, fall through to raw source
          processedSource = source;
        }
      }

      // Wait for HTMLImageElement to finish loading if needed
      await ensureImageReady(processedSource);

      const imgUrl = resolveSourceToUrl(processedSource);
      // Track blob URLs for cleanup
      if (imgUrl.startsWith('blob:')) {
        blobUrlRef.current = imgUrl;
      }
      if (signal?.disposed) return;

      const htmlImg = await loadImage(imgUrl);
      if (signal?.disposed) return;

      // Validate dimensions
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

      // Downscale if the image is very large
      const scaled = downscaleIfNeeded(htmlImg);
      let workingUrl = imgUrl;
      let workingWidth = htmlImg.naturalWidth;
      let workingHeight = htmlImg.naturalHeight;

      if (scaled.wasDownscaled) {
        workingUrl = scaled.dataUrl;
        workingWidth = scaled.workingWidth;
        workingHeight = scaled.workingHeight;
        // Pre-load the downscaled data URL into the cache
        await loadImage(workingUrl);
      }

      if (signal?.disposed) return;

      setOriginalImage({
        src: imgUrl,
        width: htmlImg.naturalWidth,
        height: htmlImg.naturalHeight,
      });

      const ce = await CreativeEngine.create({
        container: containerRef.current!,
      });
      if (signal?.disposed) return;

      engineRef.current = ce;

      await ce.scene.create({ width: workingWidth, height: workingHeight });

      const pageId = ce.scene.getCurrentPage();
      if (pageId === null) return;

      const blockId = ce.block.create('image');
      ce.block.setString(blockId, IMAGE_SRC, workingUrl);
      ce.block.setSize(blockId, workingWidth, workingHeight);
      ce.block.setPosition(blockId, 0, 0);
      ce.block.appendChild(pageId, blockId);

      setImageBlockId(blockId);
      setLoading(false);
      setEngine(ce);
    } catch (err) {
      if (signal?.disposed) return;
      const message = err instanceof Error ? err.message : 'Failed to load image';
      console.error('[creative-editor] Init error:', message);
      setError(message);
      setLoading(false);
    }
  }, [setOriginalImage, setLoading, setImageBlockId, setError, clearError, cleanupBlobUrl, validation]);

  // Initialize on mount and when src changes
  useEffect(() => {
    const signal = { disposed: false };
    initEditor(src, signal);

    return () => {
      signal.disposed = true;
      cleanupBlobUrl();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [src, initEditor, cleanupBlobUrl]);

  const handleRetry = useCallback(() => {
    initEditor(currentSrcRef.current);
  }, [initEditor]);

  // --- Drag-and-drop support ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Try file drop first
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      initEditor(file);
      return;
    }

    // Try URL drop
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
      initEditor(url);
    }
  }, [initEditor]);

  // --- Clipboard paste support ---
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          initEditor(blob);
          return;
        }
      }
    }
  }, [initEditor]);

  return (
    <div
      style={{ width, height }}
      className="relative flex flex-col bg-gray-900 overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <ImageEditorToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 h-full" />
      </div>

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-white text-lg">Loading image...</div>
        </div>
      )}

      {/* Error overlay with retry */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20 gap-4">
          <div className="text-red-400 text-lg font-medium">Failed to load image</div>
          <div className="text-gray-400 text-sm max-w-md text-center">{error}</div>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
