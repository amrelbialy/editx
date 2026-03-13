import React, { useCallback, useEffect } from 'react';
import { CropPanel } from './components/panels/crop-panel';
import { RotatePanel } from './components/panels/rotate-panel';
import { AdjustPanel } from './components/panels/adjust-panel';
import { FilterPanel } from './components/panels/filter-panel';
import { ShapesPanel } from './components/panels/shapes-panel';
import { TextPanel } from './components/panels/text-panel';
import { ImagePanel } from './components/panels/image-panel';
import { ColorPropertyPanel } from './components/panels/color-property-panel';
import { BackgroundPropertyPanel } from './components/panels/background-property-panel';
import { ShadowPropertyPanel } from './components/panels/shadow-property-panel';
import { StrokePropertyPanel } from './components/panels/stroke-property-panel';
import { PositionPropertyPanel } from './components/panels/position-property-panel';
import { ImageFillPanel } from './components/panels/image-fill-panel';
import { BlockPropertiesBar } from './components/shell/block-properties-bar';
import { BlockActionBar } from './components/shell/block-action-bar';
import { ToolPropertiesBar } from './components/shell/tool-properties-bar';
import { TextEditorOverlay } from './components/text-editor-overlay';
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
import { useImageTool } from './hooks/use-image-tool';
import { useBlockActions } from './hooks/use-block-actions';
import { useBlockScreenRect } from './hooks/use-block-screen-rect';
import { useBlockEffects } from './hooks/use-block-effects';
import { useToolManager } from './hooks/use-tool-manager';
import { useExport } from './hooks/use-export';
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
  const imageTool = useImageTool({ engineRef });
  const blockActions = useBlockActions({
    engineRef,
    selectedBlockId: selectedShapeId,
    onDeselect: () => setSelectedShapeId(null),
  });

  const blockScreenRect = useBlockScreenRect(engine ?? null, selectedShapeId);

    // Determine if a block is selected and its type
  const selectedBlockType = engine && selectedShapeId !== null
    ? engine.block.getType(selectedShapeId) as 'text' | 'graphic' | string
    : null;
  const blockEffects = useBlockEffects({
    engineRef,
    blockId: selectedBlockType === 'image' ? selectedShapeId : null,
  });

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

  // --- Export hook ---
  const { handleExport, isExporting } = useExport({
    engineRef,
    exportConfig: userConfig?.export,
    onSave,
    events,
  });

  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);

  const isCropMode = activeTool === 'crop';
  const isRotateMode = activeTool === 'rotate';
  const isAdjustMode = activeTool === 'adjust';
  const isFilterMode = activeTool === 'filter';
  const isShapesMode = activeTool === 'shapes';
  const isTextMode = activeTool === 'text';
  const isImageMode = activeTool === 'image';

  const toolPanelTitle = (() => {
    switch (activeTool) {
      case 'crop': return 'Crop';
      case 'rotate': return 'Rotate & Flip';
      case 'adjust': return 'Adjustments';
      case 'filter': return 'Filters';
      case 'shapes': return 'Shapes';
      case 'text': return 'Text';
      case 'image': return 'Image';
      default: {
        const ct = userConfig?.customTools?.find((t) => t.id === activeTool);
        return ct?.label;
      }
    }
  })();

  const activeCustomTool = userConfig?.customTools?.find((t) => t.id === activeTool);


  const hasSelectedBlock = selectedBlockType === 'text' || selectedBlockType === 'graphic' || selectedBlockType === 'image';

  // Property side panel title mapping
  const propertySidePanelTitle = (() => {
    switch (propertySidePanel) {
      case 'color': return 'Color';
      case 'background': return 'Background';
      case 'shadow': return 'Shadow';
      case 'position': return 'Position';
      case 'stroke': return 'Stroke';
      case 'adjust': return 'Adjustments';
      case 'filter': return 'Filters';
      case 'imageFill': return 'Image';
      default: return undefined;
    }
  })();

  // Whether the tool panel should be open
  const toolPanelOpen = activeTool !== 'select' || propertySidePanel !== null;
  const effectivePanelTitle = propertySidePanel ? propertySidePanelTitle : toolPanelTitle;

  // Reset property side panel when block is deselected
  useEffect(() => {
    if (!hasSelectedBlock && propertySidePanel !== null) {
      setPropertySidePanel(null);
    }
  }, [hasSelectedBlock, propertySidePanel, setPropertySidePanel]);

  // --- Keyboard shortcuts ---
  useShortcuts({
    enabled: !isLoading && !error,
    onToolSelect: handleSidebarToolSelect,
    onUndo: () => engineRef.current?.editor.undo(),
    onRedo: () => engineRef.current?.editor.redo(),
    onZoomIn: () => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 1.25); },
    onZoomOut: () => { const ce = engineRef.current; if (ce) ce.editor.setZoom(ce.editor.getZoom() * 0.8); },
    onZoomFit: () => engineRef.current?.editor.fitToScreen(),
    onDuplicate: blockActions.duplicate,
    onBringForward: blockActions.bringForward,
    onSendBackward: blockActions.sendBackward,
    onBringToFront: blockActions.bringToFront,
    onSendToBack: blockActions.sendToBack,
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
                  onExport={handleExport}
                  isExporting={isExporting}
                  topbarRight={slots?.topbarRight}
                />

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
                        open={toolPanelOpen}
                        title={effectivePanelTitle}
                        onClose={() => {
                          if (propertySidePanel) {
                            setPropertySidePanel(null);
                          } else if (activeTool === 'crop') {
                            crop.handleCropCancel();
                          } else {
                            setActiveTool('select');
                          }
                        }}
                      >
                        {/* Property sub-panels (override tool content) */}
                        {propertySidePanel && engine && selectedShapeId !== null ? (
                          <>
                            {propertySidePanel === 'color' && (
                              <ColorPropertyPanel
                                engine={engine}
                                blockId={selectedShapeId}
                                blockType={selectedBlockType as 'text' | 'graphic'}
                              />
                            )}
                            {propertySidePanel === 'background' && (
                              <BackgroundPropertyPanel engine={engine} blockId={selectedShapeId} />
                            )}
                            {propertySidePanel === 'shadow' && (
                              <ShadowPropertyPanel engine={engine} blockId={selectedShapeId} />
                            )}
                            {propertySidePanel === 'stroke' && (
                              <StrokePropertyPanel engine={engine} blockId={selectedShapeId} />
                            )}
                            {propertySidePanel === 'position' && (
                              <PositionPropertyPanel
                                engine={engine}
                                blockId={selectedShapeId}
                                onBringForward={blockActions.bringForward}
                                onSendBackward={blockActions.sendBackward}
                                onBringToFront={blockActions.bringToFront}
                                onSendToBack={blockActions.sendToBack}
                                onAlign={blockActions.alignToPage}
                              />
                            )}
                            {propertySidePanel === 'adjust' && selectedBlockType === 'image' && (
                              <AdjustPanel
                                values={blockEffects.adjustValues}
                                onChange={blockEffects.handleAdjustChange}
                                onReset={blockEffects.handleAdjustReset}
                              />
                            )}
                            {propertySidePanel === 'filter' && selectedBlockType === 'image' && (
                              <FilterPanel
                                activeFilter={blockEffects.activeFilter}
                                onSelect={blockEffects.handleFilterSelect}
                              />
                            )}
                            {propertySidePanel === 'imageFill' && selectedBlockType === 'image' && (
                              <ImageFillPanel
                                engine={engine}
                                blockId={selectedShapeId}
                                onReplace={(file: File) => imageTool.handleReplaceImage(file, selectedShapeId)}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            {isCropMode && (
                              <CropPanel
                                onPresetChange={crop.handleCropPresetChange}
                                onResizeDimensions={crop.handleResizeDimensions}
                                cropDimensions={crop.cropDimensions}
                              />
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
                            {isImageMode && (
                              <ImagePanel onAddImage={imageTool.handleAddImage} />
                            )}
                            {/* Custom tool panel */}
                            {activeCustomTool?.panel && <activeCustomTool.panel />}
                          </>
                        )}
                      </ToolPanel>
                    </>
                  )}

                  <CanvasArea
                    canvasRef={containerRef}
                    header={
                      engine && selectedShapeId !== null && hasSelectedBlock ? (
                        <BlockPropertiesBar
                          engine={engine}
                          blockId={selectedShapeId}
                          blockType={selectedBlockType as 'text' | 'graphic' | 'image'}
                        />
                      ) : activeTool !== 'select' ? (
                        <ToolPropertiesBar
                          activeTool={activeTool}
                          onReset={handleContextualReset}
                          onDone={handleDone}
                          onRotateClockwise={rotateFlip.handleRotateClockwise}
                          onRotateCounterClockwise={rotateFlip.handleRotateCounterClockwise}
                          onFlipHorizontal={rotateFlip.handleFlipHorizontal}
                          onFlipVertical={rotateFlip.handleFlipVertical}
                          customContent={
                            activeCustomTool?.contextualBar
                              ? React.createElement(activeCustomTool.contextualBar)
                              : slots?.contextualBarExtra
                          }
                        />
                      ) : undefined
                    }
                    overlay={
                      engine && selectedShapeId !== null && hasSelectedBlock && blockScreenRect ? (
                        <div
                          className="absolute z-10 pointer-events-none"
                          style={{
                            left: blockScreenRect.x + blockScreenRect.width / 2,
                            top: blockScreenRect.y - 8,
                            transform: 'translate(-50%, -100%)',
                          }}
                        >
                          <div className="pointer-events-auto">
                            <BlockActionBar
                              blockType={selectedBlockType!}
                              onReplace={
                                selectedBlockType === 'image'
                                  ? (file: File) => imageTool.handleReplaceImage(file, selectedShapeId)
                                  : undefined
                              }
                              onBringForward={blockActions.bringForward}
                              onSendBackward={blockActions.sendBackward}
                              onBringToFront={blockActions.bringToFront}
                              onSendToBack={blockActions.sendToBack}
                              onDuplicate={blockActions.duplicate}
                              onDelete={blockActions.deleteBlock}
                              onAlign={blockActions.alignToPage}
                            />
                          </div>
                        </div>
                      ) : undefined
                    }
                  >
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
                        <CropPanel
                          onPresetChange={crop.handleCropPresetChange}
                          onResizeDimensions={crop.handleResizeDimensions}
                          cropDimensions={crop.cropDimensions}
                        />
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
                      {isImageMode && (
                        <ImagePanel onAddImage={imageTool.handleAddImage} />
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
