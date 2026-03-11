import React, { useCallback, useEffect } from 'react';
import { CropPanel } from './components/panels/crop-panel';
import { RotatePanel } from './components/panels/rotate-panel';
import { AdjustPanel } from './components/panels/adjust-panel';
import { FilterPanel } from './components/panels/filter-panel';
import { ShapesPanel } from './components/panels/shapes-panel';
import { ShapePropertiesPanel } from './components/panels/shape-properties-panel';
import { TextPanel } from './components/panels/text-panel';
import { TextPropertiesPanel } from './components/panels/text-properties-panel';
import { TextEditorOverlay } from './components/text-editor-overlay';
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
import { useEngine } from './hooks/use-engine';
import { useCropTool } from './hooks/use-crop-tool';
import { useRotateFlipTool } from './hooks/use-rotate-flip-tool';
import { useAdjustmentsTool } from './hooks/use-adjustments-tool';
import { useFilterTool } from './hooks/use-filter-tool';
import { useShapesTool } from './hooks/use-shapes-tool';
import { useTextTool } from './hooks/use-text-tool';
import { useToolManager } from './hooks/use-tool-manager';
import { useImageEditorStore } from './store/image-editor-store';
import type { ImageValidationOptions } from './utils/validate-image';
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
  // --- Engine lifecycle ---
  const {
    containerRef,
    engine,
    engineRef,
    handleRetry,
    handleDragOver,
    handleDrop,
    handlePaste,
    selectedShapeId,
    setSelectedShapeId,
  } = useEngine({ src, validation, keepZoomOnSourceChange });

  const isLoading = useImageEditorStore((s) => s.isLoading);
  const error = useImageEditorStore((s) => s.error);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);

  // --- Responsive hook ---
  const { isMobile } = useResponsive();

  // --- Tool hooks ---
  const crop = useCropTool({ engineRef });
  const rotateFlip = useRotateFlipTool({ engineRef });
  const adjustments = useAdjustmentsTool({ engineRef });
  const filter = useFilterTool({ engineRef });
  const shapes = useShapesTool({ engineRef });
  const textTool = useTextTool({ engineRef });

  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);
  const setEditingTextBlockId = useImageEditorStore((s) => s.setEditingTextBlockId);

  // Subscribe to dblclick on text blocks to enter inline editing
  useEffect(() => {
    if (!engine) return;
    const unsub = engine.on('block:dblclick', (blockId: number) => {
      if (engine.block.getType(blockId) === 'text') {
        setEditingTextBlockId(blockId);
      }
    });
    return unsub;
  }, [engine, setEditingTextBlockId]);

  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  const handleCloseTextEditor = useCallback(() => {
    setEditingTextBlockId(null);
    setTextSelectionRange(null);
  }, [setEditingTextBlockId, setTextSelectionRange]);

  const {
    activeTool,
    activeToolId,
    handleSidebarToolSelect,
    handleDone,
    handleContextualReset,
  } = useToolManager({
    engineRef,
    enterCropMode: crop.enterCropMode,
    handleCropApply: crop.handleCropApply,
    handleCropCancel: crop.handleCropCancel,
    handleRotateReset: rotateFlip.handleRotateReset,
    handleAdjustReset: adjustments.handleAdjustReset,
    syncRotationState: rotateFlip.syncRotationState,
    ensureAdjustEffect: adjustments.ensureAdjustEffect,
    syncAdjustValues: adjustments.syncAdjustValues,
    ensureFilterEffect: filter.ensureFilterEffect,
    syncFilterState: filter.syncFilterState,
    events,
  });

  const isCropMode = activeTool === 'crop';
  const isRotateMode = activeTool === 'rotate';
  const isAdjustMode = activeTool === 'adjust';
  const isFilterMode = activeTool === 'filter';
  const isShapesMode = activeTool === 'shapes';
  const isTextMode = activeTool === 'text';

  const toolPanelTitle = (() => {
    switch (activeTool) {
      case 'crop': return 'Crop';
      case 'rotate': return 'Rotate & Flip';
      case 'adjust': return 'Adjustments';
      case 'filter': return 'Filters';
      case 'shapes': return 'Shapes';
      case 'text': return 'Text';
      default: {
        const ct = userConfig?.customTools?.find((t) => t.id === activeTool);
        return ct?.label;
      }
    }
  })();

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
          crop.handleCropCancel();
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotateFlip.handleRotateCounterClockwise} title="Rotate 90° left">
                        <RotateCcwIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotateFlip.handleRotateClockwise} title="Rotate 90° right">
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Separator orientation="vertical" className="h-4" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotateFlip.handleFlipHorizontal} title="Flip horizontal">
                        <FlipHorizontal className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotateFlip.handleFlipVertical} title="Flip vertical">
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
                  {isTextMode && (
                    <span className="text-xs text-muted-foreground">Add and edit text</span>
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
                            crop.handleCropCancel();
                          } else {
                            setActiveTool('select');
                          }
                        }}
                      >
                        {isCropMode && (
                          <CropPanel onPresetChange={crop.handleCropPresetChange} />
                        )}
                        {isRotateMode && (
                          <RotatePanel
                            rotation={rotateFlip.rotationState.rotation}
                            flipH={rotateFlip.rotationState.flipH}
                            flipV={rotateFlip.rotationState.flipV}
                            onRotationChange={rotateFlip.handleRotationChange}
                            onRotateClockwise={rotateFlip.handleRotateClockwise}
                            onRotateCounterClockwise={rotateFlip.handleRotateCounterClockwise}
                            onFlipHorizontal={rotateFlip.handleFlipHorizontal}
                            onFlipVertical={rotateFlip.handleFlipVertical}
                            onReset={rotateFlip.handleRotateReset}
                          />
                        )}
                        {isAdjustMode && (
                          <AdjustPanel
                            values={adjustments.adjustValues}
                            onChange={adjustments.handleAdjustChange}
                            onReset={adjustments.handleAdjustReset}
                          />
                        )}
                        {isFilterMode && (
                          <FilterPanel
                            activeFilter={filter.activeFilter}
                            onSelect={filter.handleFilterSelect}
                          />
                        )}
                        {isShapesMode && (
                          <ShapesPanel onAddShape={shapes.handleAddShape} />
                        )}
                        {isTextMode && (
                          <TextPanel onAddText={textTool.handleAddText} />
                        )}
                        {engine && selectedShapeId !== null && engine.block.getType(selectedShapeId) === 'graphic' && (
                          <ShapePropertiesPanel engine={engine} blockId={selectedShapeId} />
                        )}
                        {engine && selectedShapeId !== null && engine.block.getType(selectedShapeId) === 'text' && (
                          <TextPropertiesPanel engine={engine} blockId={selectedShapeId} />
                        )}
                        {/* Custom tool panel */}
                        {activeCustomTool?.panel && <activeCustomTool.panel />}
                      </ToolPanel>
                    </>
                  )}

                  <CanvasArea canvasRef={containerRef}>
                    {engine && editingTextBlockId !== null && (
                      <TextEditorOverlay
                        engine={engine}
                        blockId={editingTextBlockId}
                        canvasRef={containerRef}
                        onClose={handleCloseTextEditor}
                      />
                    )}
                  </CanvasArea>
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
                          crop.handleCropCancel();
                        } else {
                          setActiveTool('select');
                        }
                      }}
                    >
                      {isCropMode && (
                        <CropPanel onPresetChange={crop.handleCropPresetChange} />
                      )}
                      {isRotateMode && (
                        <RotatePanel
                          rotation={rotateFlip.rotationState.rotation}
                          flipH={rotateFlip.rotationState.flipH}
                          flipV={rotateFlip.rotationState.flipV}
                          onRotationChange={rotateFlip.handleRotationChange}
                          onRotateClockwise={rotateFlip.handleRotateClockwise}
                          onRotateCounterClockwise={rotateFlip.handleRotateCounterClockwise}
                          onFlipHorizontal={rotateFlip.handleFlipHorizontal}
                          onFlipVertical={rotateFlip.handleFlipVertical}
                          onReset={rotateFlip.handleRotateReset}
                        />
                      )}
                      {isAdjustMode && (
                        <AdjustPanel
                          values={adjustments.adjustValues}
                          onChange={adjustments.handleAdjustChange}
                          onReset={adjustments.handleAdjustReset}
                        />
                      )}
                      {isFilterMode && (
                        <FilterPanel
                          activeFilter={filter.activeFilter}
                          onSelect={filter.handleFilterSelect}
                        />
                      )}
                      {isShapesMode && (
                        <ShapesPanel onAddShape={shapes.handleAddShape} />
                      )}
                      {isTextMode && (
                        <TextPanel onAddText={textTool.handleAddText} />
                      )}
                      {engine && selectedShapeId !== null && engine.block.getType(selectedShapeId) === 'graphic' && (
                        <ShapePropertiesPanel engine={engine} blockId={selectedShapeId} />
                      )}
                      {engine && selectedShapeId !== null && engine.block.getType(selectedShapeId) === 'text' && (
                        <TextPropertiesPanel engine={engine} blockId={selectedShapeId} />
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
