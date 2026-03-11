import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CreativeEngine, evictImage,
  toPrecisedFloat,
  ADJUSTMENT_CONFIG, ADJUSTMENT_PARAMS,
  EFFECT_FILTER_NAME,
  SHAPE_POLYGON_SIDES,
  type AdjustmentParam,
  type ShapeType,
} from '@creative-editor/engine';
import { useImageEditorStore, type CropPresetId, type ImageEditorTool } from './store/image-editor-store';
import { loadImage, sourceToUrl, revokeObjectUrl } from './utils/load-image';
import { validateImageFile, validateImageDimensions, type ImageValidationOptions } from './utils/validate-image';
import { downscaleIfNeeded } from './utils/downscale-image';
import { correctOrientation } from './utils/correct-orientation';
import { isSameSource } from './utils/is-same-source';
import { extractFilename } from './utils/extract-filename';
import { CropPanel } from './components/panels/crop-panel';
import { RotatePanel } from './components/panels/rotate-panel';
import { AdjustPanel, type AdjustmentValues } from './components/panels/adjust-panel';
import { FilterPanel } from './components/panels/filter-panel';
import { ShapesPanel } from './components/panels/shapes-panel';
import { ShapePropertiesPanel } from './components/panels/shape-properties-panel';
import { RotateCw, RotateCcw as RotateCcwIcon, FlipHorizontal, FlipVertical } from 'lucide-react';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { Spinner } from './components/ui/spinner';
import { TooltipProvider } from './components/ui/tooltip';
import { ImageEditorProvider } from './config/config-context';
import { ThemeProvider } from './theme/theme-provider';
import { I18nProvider } from './i18n/i18n-context';
import { EditorShell } from './components/shell/editor-shell';
import { Topbar } from './components/shell/topbar';
import { ToolSidebar } from './components/shell/tool-sidebar';
import { ToolPanel } from './components/shell/tool-panel';
import { CanvasArea } from './components/shell/canvas-area';
import { ContextualBar } from './components/shell/contextual-bar';
import { MobileToolbar } from './components/shell/mobile-toolbar';
import { ToolSheet } from './components/shell/tool-sheet';
import { useResponsive } from './hooks/use-responsive';
import { useShortcuts } from './hooks/use-shortcuts';
import type { ImageEditorConfig, ImageEditorToolId, EditorSlots, EditorEventCallbacks } from './config/config.types';

export type ImageSource = string | File | Blob | HTMLImageElement | HTMLCanvasElement;

export interface ImageEditorProps {
  src: ImageSource;
  onSave?: (blob: Blob) => void;
  onClose?: () => void;
  width?: string | number;
  height?: string | number;
  /** Validation options for file type, size, and dimension limits. */
  validation?: ImageValidationOptions;
  /** When true, preserve zoom/pan when src changes instead of resetting to fit-to-screen. */
  keepZoomOnSourceChange?: boolean;
  /** SDK configuration — tools, theme, per-tool options, UI tweaks. */
  config?: ImageEditorConfig;
  /** Named render slots for injecting custom UI into the editor shell. */
  slots?: EditorSlots;
  /** Event callbacks for editor lifecycle events. */
  events?: EditorEventCallbacks;
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
  onClose,
  width = '100%',
  height = '100vh',
  validation,
  keepZoomOnSourceChange = false,
  config: userConfig,
  slots,
  events,
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

  // --- Responsive hook ---
  const { isMobile } = useResponsive();

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

  // --- Filter local state: current effect block ID + active filter name ---
  const filterEffectIdRef = useRef<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');

  // --- Selected shape block ID (tracked via engine selection event) ---
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

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

      // Track shape selection
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

  // --- Filter helpers ---

  /** Ensure a filter effect block exists on the editable block. Returns its ID. */
  const ensureFilterEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === 'filter') {
        filterEffectIdRef.current = eid;
        return eid;
      }
    }

    const eid = ce.block.createEffect('filter');
    ce.block.appendEffect(editableBlockId, eid);
    filterEffectIdRef.current = eid;
    return eid;
  }, [editableBlockId]);

  /** Read current filter name from the effect block into local state. */
  const syncFilterState = useCallback(() => {
    const ce = engineRef.current;
    const eid = filterEffectIdRef.current;
    if (!ce || eid === null) {
      setActiveFilter('');
      return;
    }
    const name = ce.block.getString(eid, EFFECT_FILTER_NAME);
    setActiveFilter(name);
  }, []);

  /** Handle filter selection from the panel. */
  const handleFilterSelect = useCallback((name: string) => {
    const ce = engineRef.current;
    const eid = filterEffectIdRef.current;
    if (!ce || eid === null) return;

    ce.block.setString(eid, EFFECT_FILTER_NAME, name);
    setActiveFilter(name);
  }, []);

  /** Add a shape to the centre of the page. */
  const handleAddShape = useCallback((shapeType: ShapeType, sides?: number) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const pageW = ce.block.getFloat(editableBlockId, 'page/width') ?? 1080;
    const pageH = ce.block.getFloat(editableBlockId, 'page/height') ?? 1080;
    const size = Math.min(pageW, pageH) * 0.25;

    // Arrows look better wider and flatter than a square
    const shapeW = shapeType === 'line' ? pageW * 0.5 : size;
    const shapeH = shapeType === 'line' ? size : size;
    const x = (pageW - shapeW) / 2;
    const y = (pageH - shapeH) / 2;

    const graphicId = ce.block.addShape(editableBlockId, shapeType, 'color', x, y, shapeW, shapeH);

    // Override polygon sides when adding named polygons (triangle=3, hexagon=6, etc.)
    if (sides && shapeType === 'polygon') {
      const shapeId = ce.block.getShape(graphicId);
      if (shapeId != null) {
        ce.block.setFloat(shapeId, SHAPE_POLYGON_SIDES, sides);
      }
    }

    ce.block.select(graphicId);
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

      // Sync filter state when entering filter mode
      if (tool === 'filter') {
        ensureFilterEffect();
        syncFilterState();
      }
    }
    // Fire event callback
    events?.onToolChange?.(tool === 'select' ? null : tool);
  }, [activeTool, enterCropMode, setActiveTool, syncRotationState, ensureAdjustEffect, syncAdjustValues, ensureFilterEffect, syncFilterState, events]);

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
  const isFilterMode = activeTool === 'filter';
  const isShapesMode = activeTool === 'shapes';

  /** Map internal ImageEditorTool to the config's ImageEditorToolId for sidebar */
  const activeToolId: ImageEditorToolId | null =
    activeTool === 'select' || activeTool === 'rotate' || activeTool === 'resize' || activeTool === 'pen'
      ? null
      : (activeTool as ImageEditorToolId);

  const handleSidebarToolSelect = useCallback((toolId: ImageEditorToolId) => {
    // If clicking the already-active tool, deselect (close panel)
    if (activeToolId === toolId) {
      const ce = engineRef.current;
      if (activeTool === 'crop' && ce) {
        ce.editor.setEditMode('Transform');
        ce.editor.fitToScreen();
      }
      setActiveTool('select');
      return;
    }
    handleToolChange(toolId as ImageEditorTool);
  }, [activeToolId, activeTool, handleToolChange, setActiveTool]);

  const handleDone = useCallback(() => {
    if (activeTool === 'crop') {
      handleCropApply();
    } else {
      setActiveTool('select');
    }
  }, [activeTool, handleCropApply, setActiveTool]);

  const handleContextualReset = useCallback(() => {
    if (activeTool === 'crop') {
      handleCropCancel();
    } else if (activeTool === 'rotate') {
      handleRotateReset();
    } else if (activeTool === 'adjust') {
      handleAdjustReset();
    }
  }, [activeTool, handleCropCancel, handleRotateReset, handleAdjustReset]);

  const toolPanelTitle = (() => {
    switch (activeTool) {
      case 'crop': return 'Crop';
      case 'rotate': return 'Rotate & Flip';
      case 'adjust': return 'Adjustments';
      case 'filter': return 'Filters';
      case 'shapes': return 'Shapes';
      default: {
        // Check custom tools
        const ct = userConfig?.customTools?.find((t) => t.id === activeTool);
        return ct?.label;
      }
    }
  })();

  /** Custom tool panel component (if active tool is a custom tool) */
  const activeCustomTool = userConfig?.customTools?.find((t) => t.id === activeTool);

  const showContextualBar = activeTool !== 'select';

  // --- Keyboard shortcuts ---
  useShortcuts({
    enabled: !isLoading && !error,
    onToolSelect: handleSidebarToolSelect,
    onUndo: () => engineRef.current?.editor.undo(),
    onRedo: () => engineRef.current?.editor.redo(),
    onZoomIn: () => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 1.25); },
    onZoomOut: () => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 0.8); },
    onZoomFit: () => engineRef.current?.editor.fitToScreen(),
    onEscape: () => {
      if (activeTool !== 'select') {
        if (activeTool === 'crop') {
          handleCropCancel();
        } else {
          setActiveTool('select');
        }
      }
    },
    onDelete: () => {
      if (selectedShapeId !== null) {
        engineRef.current?.block.destroy(selectedShapeId);
        setSelectedShapeId(null);
      }
    },
  });

  return (
    <ImageEditorProvider config={userConfig}>
      <ThemeProvider theme={userConfig?.theme}>
        <I18nProvider locale={userConfig?.locale} translations={userConfig?.translations}>
          <TooltipProvider>
            <EditorShell
              style={{ width, height }}
              className="relative"
            >
              {/* Drag/drop + paste wrapper */}
              <div
                className="flex flex-col h-full w-full"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onPaste={handlePaste}
                tabIndex={0}
              >
                <Topbar
                  onUndo={() => engineRef.current?.editor.undo()}
                  onRedo={() => engineRef.current?.editor.redo()}
                  canUndo={!!engine}
                  canRedo={!!engine}
                  onZoomIn={() => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 1.25); }}
                  onZoomOut={() => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 0.8); }}
                  onZoomFit={() => engineRef.current?.editor.fitToScreen()}
                  onExport={onSave ? () => { /* TODO: implement export */ } : undefined}
                  topbarRight={slots?.topbarRight}
                />

                <ContextualBar
                  visible={showContextualBar}
                  onReset={handleContextualReset}
                  onDone={handleDone}
                >
                  {/* Crop & Rotate tools: quick rotate/flip in contextual bar */}
                  {(isCropMode || isRotateMode) && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotateCounterClockwise} title="Rotate 90° left">
                        <RotateCcwIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotateClockwise} title="Rotate 90° right">
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Separator orientation="vertical" className="h-4" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFlipHorizontal} title="Flip horizontal">
                        <FlipHorizontal className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFlipVertical} title="Flip vertical">
                        <FlipVertical className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {isAdjustMode && (
                    <span className="text-xs text-muted-foreground">Adjust image tones and colors</span>
                  )}
                  {isFilterMode && (
                    <span className="text-xs text-muted-foreground">Apply preset looks</span>
                  )}
                  {isShapesMode && (
                    <span className="text-xs text-muted-foreground">Add and arrange shapes</span>
                  )}
                  {/* Custom tool contextual bar */}
                  {activeCustomTool?.contextualBar && <activeCustomTool.contextualBar />}
                  {/* Slot: extra contextual bar content */}
                  {slots?.contextualBarExtra}
                </ContextualBar>

                <div className="flex flex-1 overflow-hidden">
                  {/* Desktop: sidebar + slide-out panel */}
                  {!isMobile && (
                    <>
                      <ToolSidebar
                        activeTool={activeToolId}
                        onToolSelect={handleSidebarToolSelect}
                        customTools={userConfig?.customTools}
                        sidebarBottom={slots?.sidebarBottom}
                      />

                      <ToolPanel
                        open={activeTool !== 'select'}
                        title={toolPanelTitle}
                        onClose={() => {
                          if (activeTool === 'crop') {
                            handleCropCancel();
                          } else {
                            setActiveTool('select');
                          }
                        }}
                      >
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
                        {isFilterMode && (
                          <FilterPanel
                            activeFilter={activeFilter}
                            onSelect={handleFilterSelect}
                          />
                        )}
                        {isShapesMode && (
                          <ShapesPanel onAddShape={handleAddShape} />
                        )}
                        {engine && selectedShapeId !== null && (
                          <ShapePropertiesPanel engine={engine} blockId={selectedShapeId} />
                        )}
                        {/* Custom tool panel */}
                        {activeCustomTool?.panel && <activeCustomTool.panel />}
                      </ToolPanel>
                    </>
                  )}

                  <CanvasArea canvasRef={containerRef} />
                </div>

                {/* Mobile: bottom toolbar + sheet */}
                {isMobile && (
                  <>
                    <MobileToolbar
                      activeTool={activeToolId}
                      onToolSelect={handleSidebarToolSelect}
                    />
                    <ToolSheet
                      open={activeTool !== 'select'}
                      title={toolPanelTitle}
                      onClose={() => {
                        if (activeTool === 'crop') {
                          handleCropCancel();
                        } else {
                          setActiveTool('select');
                        }
                      }}
                    >
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
                      {isFilterMode && (
                        <FilterPanel
                          activeFilter={activeFilter}
                          onSelect={handleFilterSelect}
                        />
                      )}
                      {isShapesMode && (
                        <ShapesPanel onAddShape={handleAddShape} />
                      )}
                      {engine && selectedShapeId !== null && (
                        <ShapePropertiesPanel engine={engine} blockId={selectedShapeId} />
                      )}
                      {activeCustomTool?.panel && <activeCustomTool.panel />}
                    </ToolSheet>
                  </>
                )}
              </div>

              {/* Loading overlay */}
              {isLoading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-3" role="status">
                  <Spinner size="lg" />
                  <span className="text-muted-foreground text-sm">Loading image...</span>
                </div>
              )}

              {/* Error overlay with retry */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 gap-4" role="alert">
                  <div className="text-destructive text-lg font-medium">Failed to load image</div>
                  <div className="text-muted-foreground text-sm max-w-md text-center">{error}</div>
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </EditorShell>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ImageEditorProvider>
  );
};
