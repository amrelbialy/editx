import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreativeEngine, evictImage,
  toPrecisedFloat,
  ADJUSTMENT_CONFIG, ADJUSTMENT_PARAMS,
  type AdjustmentParam,
} from '@creative-editor/engine';
import { useImageEditorStore, type CropPresetId, type ImageEditorTool } from './store/image-editor-store';
import { loadImage, sourceToUrl, revokeObjectUrl } from './utils/load-image';
import { validateImageFile, validateImageDimensions, type ImageValidationOptions } from './utils/validate-image';
import { downscaleIfNeeded } from './utils/downscale-image';
import { correctOrientation } from './utils/correct-orientation';
import { isSameSource } from './utils/is-same-source';
import { extractFilename } from './utils/extract-filename';
import { ImageEditorToolbar } from './components/toolbar';
import { CropPanel } from './components/panels/crop-panel';
import { RotatePanel } from './components/panels/rotate-panel';
import { AdjustPanel, type AdjustmentValues } from './components/panels/adjust-panel';
import { CropActionBar } from './components/crop-action-bar';

export type ImageSource = string | File | Blob | HTMLImageElement | HTMLCanvasElement;

export interface ImageEditorProps {
  src: ImageSource;
  onSave?: (blob: Blob) => void;
  width?: string | number;
  height?: string | number;
  /** Validation options for file type, size, and dimension limits. */
  validation?: ImageValidationOptions;
  /** When true, preserve zoom/pan when src changes instead of resetting to fit-to-screen. */
  keepZoomOnSourceChange?: boolean;
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

/**
 * Extract the raw URL string from a source for identity comparison.
 * Does NOT create blob URLs — purely reads existing URLs.
 */
function getSourceIdentity(source: ImageSource): string | null {
  if (typeof source === 'string') return source;
  if (source instanceof HTMLImageElement) return source.src || null;
  // File, Blob, Canvas → identity is by object reference, not URL
  return null;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  src,
  onSave,
  width = '100%',
  height = '100vh',
  validation,
  keepZoomOnSourceChange = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CreativeEngine | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [engine, setEngine] = useState<CreativeEngine | null>(null);

  // --- 5.1: Source deduplication ---
  const loadedSourceRef = useRef<ImageSource | null>(null);

  // --- 5.7: Concurrent load guard ---
  const loadingSourceIdentityRef = useRef<string | null>(null);

  const setOriginalImage = useImageEditorStore((s) => s.setOriginalImage);
  const setLoading = useImageEditorStore((s) => s.setLoading);
  const setEditableBlockId = useImageEditorStore((s) => s.setEditableBlockId);
  const setError = useImageEditorStore((s) => s.setError);
  const clearError = useImageEditorStore((s) => s.clearError);
  const setShownImageDimensions = useImageEditorStore((s) => s.setShownImageDimensions);
  const isLoading = useImageEditorStore((s) => s.isLoading);
  const error = useImageEditorStore((s) => s.error);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  // --- Rotate & Flip local state (read from engine, updated on actions) ---
  const [rotationState, setRotationState] = useState({ rotation: 0, flipH: false, flipV: false });

  // --- Adjust local state: current effect block ID + slider values ---
  const adjustEffectIdRef = useRef<number | null>(null);
  const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
    brightness: 0, saturation: 0, contrast: 0, gamma: 0,
    clarity: 0, exposure: 0, shadows: 0, highlights: 0,
    blacks: 0, whites: 0, temperature: 0, sharpness: 0,
  };
  const [adjustValues, setAdjustValues] = useState<AdjustmentValues>(DEFAULT_ADJUSTMENTS);

  // Track current source to allow re-init on change
  const currentSrcRef = useRef<ImageSource>(src);
  currentSrcRef.current = src;

  // --- 5.9: Store previous zoom/pan for preservation ---
  const prevZoomRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

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

    // --- 5.1: Skip if same source already loaded ---
    if (isSameSource(source, loadedSourceRef.current) && engineRef.current) {
      return;
    }

    // --- 5.7: Skip if this exact source is already being loaded ---
    const identity = getSourceIdentity(source);
    if (identity && identity === loadingSourceIdentityRef.current) {
      return;
    }
    loadingSourceIdentityRef.current = identity;

    // --- 5.9: Save previous zoom/pan before destroying engine ---
    if (keepZoomOnSourceChange && engineRef.current) {
      prevZoomRef.current = {
        zoom: engineRef.current.editor.getZoom(),
        pan: engineRef.current.editor.getPan(),
      };
    } else {
      prevZoomRef.current = null;
    }

    // Clean up previous engine and blob URL
    engineRef.current?.dispose();
    engineRef.current = null;
    setEngine(null);
    cleanupBlobUrl();
    loadedSourceRef.current = null;

    // --- 5.6: Only show spinner if the URL actually changed ---
    const prevOriginal = useImageEditorStore.getState().originalImage;
    const isSameUrl = prevOriginal && identity && prevOriginal.src === identity;
    if (!isSameUrl) {
      setLoading(true);
    }
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

      // --- 5.2 + 5.8: Extract filename ---
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

      // Set IMAGE_SRC directly on the page — the page IS the image (page-as-image).
      ce.block.setPageImageSrc(pageId, workingUrl);
      // Store original image dimensions for crop re-entry.
      ce.block.setPageImageOriginalDimensions(pageId, workingWidth, workingHeight);

      setEditableBlockId(pageId);

      // --- 5.9: Restore zoom/pan if keeping across source change ---
      if (prevZoomRef.current) {
        ce.editor.setZoom(prevZoomRef.current.zoom);
        ce.editor.panTo(prevZoomRef.current.pan.x, prevZoomRef.current.pan.y);
        prevZoomRef.current = null;
      }

      // --- 5.4: Compute shown image dimensions ---
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
    } catch (err) {
      if (signal?.disposed) return;
      loadingSourceIdentityRef.current = null;
      const message = err instanceof Error ? err.message : 'Failed to load image';
      console.error('[creative-editor] Init error:', message);

      // --- 5.5: Graceful fallback when dimensions are known ---
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

  // Initialize on mount and when src changes
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
    // Force retry by clearing dedup ref
    loadedSourceRef.current = null;
    loadingSourceIdentityRef.current = null;
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
      // New file object — always different, clear dedup
      loadedSourceRef.current = null;
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
          // New blob object — always different, clear dedup
          loadedSourceRef.current = null;
          initEditor(blob);
          return;
        }
      }
    }
  }, [initEditor]);

  // ── Crop tool integration ───────────────────────────

  /** Resolve numeric ratio from a preset ID. */
  const resolveRatio = useCallback((presetId: CropPresetId): number | null => {
    const originalImage = useImageEditorStore.getState().originalImage;
    switch (presetId) {
      case 'free': return null;
      case 'original': return originalImage ? toPrecisedFloat(originalImage.width / originalImage.height) : null;
      case '1:1': return 1;
      case '4:3': return toPrecisedFloat(4 / 3);
      case '3:4': return toPrecisedFloat(3 / 4);
      case '16:9': return toPrecisedFloat(16 / 9);
      case '9:16': return toPrecisedFloat(9 / 16);
      default: return null;
    }
  }, []);

  /** Enter crop mode on the editable block. */
  const enterCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.editor.setEditMode('Crop', { blockId: editableBlockId });
    setCropPreset('free');
    setActiveTool('crop');
  }, [editableBlockId, setCropPreset, setActiveTool]);

  /** Exit crop mode and return to Transform. */
  const exitCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode('Transform');
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [setActiveTool]);

  // --- Rotate & Flip helpers ---

  /** Read rotation/flip state from engine into local state. */
  const syncRotationState = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    setRotationState({
      rotation: ce.block.getImageRotation(editableBlockId),
      flipH: ce.block.isCropFlippedHorizontal(editableBlockId),
      flipV: ce.block.isCropFlippedVertical(editableBlockId),
    });
  }, [editableBlockId]);

  // --- Adjust helpers ---

  /** Ensure an adjustments effect block exists on the editable block. Returns its ID. */
  const ensureAdjustEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    // Check if one already exists
    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === 'adjustments') {
        adjustEffectIdRef.current = eid;
        return eid;
      }
    }

    // Create and attach
    const eid = ce.block.createEffect('adjustments');
    ce.block.appendEffect(editableBlockId, eid);
    adjustEffectIdRef.current = eid;
    return eid;
  }, [editableBlockId]);

  /** Read current adjustment values from the effect block into local state. */
  const syncAdjustValues = useCallback(() => {
    const ce = engineRef.current;
    const eid = adjustEffectIdRef.current;
    if (!ce || eid === null) {
      setAdjustValues(DEFAULT_ADJUSTMENTS);
      return;
    }

    const vals = {} as AdjustmentValues;
    for (const param of ADJUSTMENT_PARAMS) {
      vals[param] = ce.block.getFloat(eid, ADJUSTMENT_CONFIG[param].key);
    }
    setAdjustValues(vals);
  }, []);

  /** Handle a single adjustment slider change. */
  const handleAdjustChange = useCallback((param: AdjustmentParam, value: number) => {
    const ce = engineRef.current;
    const eid = adjustEffectIdRef.current;
    if (!ce || eid === null) return;

    ce.block.setFloat(eid, ADJUSTMENT_CONFIG[param].key, value);
    setAdjustValues((prev) => ({ ...prev, [param]: value }));
  }, []);

  /** Reset all adjustments by removing the effect block and recreating it. */
  const handleAdjustReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    // Remove existing effect
    const effects = ce.block.getEffects(editableBlockId);
    for (let i = effects.length - 1; i >= 0; i--) {
      if (ce.block.getKind(effects[i]) === 'adjustments') {
        ce.block.removeEffect(editableBlockId, i);
        break;
      }
    }

    // Create fresh
    const eid = ce.block.createEffect('adjustments');
    ce.block.appendEffect(editableBlockId, eid);
    adjustEffectIdRef.current = eid;
    setAdjustValues(DEFAULT_ADJUSTMENTS);
  }, [editableBlockId]);

  /** Handle toolbar tool selection — orchestrates engine mode + store state. */
  const handleToolChange = useCallback((tool: ImageEditorTool) => {
    if (tool === 'crop') {
      enterCropMode();
    } else {
      // If leaving crop mode, tear it down via the engine first
      if (activeTool === 'crop') {
        const ce = engineRef.current;
        if (ce) {
          ce.editor.setEditMode('Transform');
          ce.editor.fitToScreen();
        }
      }
      setActiveTool(tool);

      // Sync rotation state when entering rotate mode
      if (tool === 'rotate') {
        syncRotationState();
      }

      // Sync adjustment state when entering adjust mode
      if (tool === 'adjust') {
        ensureAdjustEffect();
        syncAdjustValues();
      }
    }
  }, [activeTool, enterCropMode, setActiveTool, syncRotationState, ensureAdjustEffect, syncAdjustValues]);

  /** Called when user selects a crop preset in the panel. */
  const handleCropPresetChange = useCallback((presetId: CropPresetId) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const ratio = resolveRatio(presetId);
    ce.block.applyCropRatio(editableBlockId, ratio);
  }, [resolveRatio, editableBlockId]);

  /** Apply the crop: exit crop mode (auto-commits) + re-fit camera. */
  const handleCropApply = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;

    // setEditMode('Transform') auto-commits the current crop overlay.
    ce.editor.setEditMode('Transform');
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [setActiveTool]);

  /** Cancel crop: exit (auto-commits), then undo to discard, re-fit camera. */
  const handleCropCancel = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;

    // Exit crop mode (auto-commits), then undo to discard the commit.
    ce.editor.setEditMode('Transform');
    ce.editor.undo();
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [setActiveTool]);

  const handleRotationChange = useCallback((angle: number) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.setImageRotation(editableBlockId, angle);
    setRotationState((prev) => ({ ...prev, rotation: angle }));
  }, [editableBlockId]);

  const handleRotateClockwise = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.rotateClockwise(editableBlockId);
    ce.editor.fitToScreen();
    syncRotationState();
  }, [editableBlockId, syncRotationState]);

  const handleRotateCounterClockwise = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.rotateCounterClockwise(editableBlockId);
    ce.editor.fitToScreen();
    syncRotationState();
  }, [editableBlockId, syncRotationState]);

  const handleFlipHorizontal = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.flipCropHorizontal(editableBlockId);
    setRotationState((prev) => ({ ...prev, flipH: !prev.flipH }));
  }, [editableBlockId]);

  const handleFlipVertical = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.flipCropVertical(editableBlockId);
    setRotationState((prev) => ({ ...prev, flipV: !prev.flipV }));
  }, [editableBlockId]);

  const handleRotateReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.resetRotationAndFlip(editableBlockId);
    ce.editor.fitToScreen();
    setRotationState({ rotation: 0, flipH: false, flipV: false });
  }, [editableBlockId]);

  const isCropMode = activeTool === 'crop';
  const isRotateMode = activeTool === 'rotate';
  const isAdjustMode = activeTool === 'adjust';

  return (
    <div
      style={{ width, height }}
      className="relative flex flex-col bg-gray-900 overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <ImageEditorToolbar onToolChange={handleToolChange} />
      <div className="flex flex-1 overflow-hidden">
        {isCropMode && (
          <CropPanel onPresetChange={handleCropPresetChange} />
        )}
        {isRotateMode && (
          <RotatePanel
            rotation={rotationState.rotation}
            flipH={rotationState.flipH}
            flipV={rotationState.flipV}
            onRotationChange={handleRotationChange}
            onRotateClockwise={handleRotateClockwise}
            onRotateCounterClockwise={handleRotateCounterClockwise}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onReset={handleRotateReset}
          />
        )}
        {isAdjustMode && (
          <AdjustPanel
            values={adjustValues}
            onChange={handleAdjustChange}
            onReset={handleAdjustReset}
          />
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div ref={containerRef} className="relative flex-1 min-h-0" />
          {isCropMode && (
            <CropActionBar onApply={handleCropApply} onCancel={handleCropCancel} />
          )}
        </div>
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
