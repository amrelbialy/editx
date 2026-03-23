import type React from "react";
import { useEffect, useMemo } from "react";
import { ActiveToolContent } from "./components/shell/active-tool-content";
import { CanvasSection } from "./components/shell/canvas-section";
import { EditorShell } from "./components/shell/editor-shell";
import { ErrorPlaceholder } from "./components/shell/error-placeholder";
import { LoadingOverlay } from "./components/shell/loading-overlay";
import { getPropertyPanelTitle, getToolPanelTitle } from "./components/shell/panel-titles";
import { PropertySubPanels } from "./components/shell/property-sub-panels";
import { ToolNav } from "./components/shell/tool-nav";
import { ToolPanel } from "./components/shell/tool-panel";
import { Topbar } from "./components/shell/topbar";
import { TooltipProvider } from "./components/ui/tooltip";
import type { EditorEventCallbacks, EditorSlots, ImageEditorConfig } from "./config/config.types";
import { ImageEditorProvider } from "./config/config-context";
import { useAdjustmentsTool } from "./hooks/use-adjustments-tool";
import { useBlockActions } from "./hooks/use-block-actions";
import { useBlockEffects } from "./hooks/use-block-effects";
import { useCropTool } from "./hooks/use-crop-tool";
import { useEditorZoom } from "./hooks/use-editor-zoom";
import { useEngine } from "./hooks/use-engine";
import { useExport } from "./hooks/use-export";
import { useFilterTool } from "./hooks/use-filter-tool";
import { useImageTool } from "./hooks/use-image-tool";
import { useRotateFlipTool } from "./hooks/use-rotate-flip-tool";
import { useShapesTool } from "./hooks/use-shapes-tool";
import { useShortcuts } from "./hooks/use-shortcuts";
import { useTextTool } from "./hooks/use-text-tool";
import { useToolManager } from "./hooks/use-tool-manager";
import { I18nProvider } from "./i18n/i18n-context";
import { useImageEditorStore } from "./store/image-editor-store";
import { ThemeProvider } from "./theme/theme-provider";
import type { ImageValidationOptions } from "./utils/validate-image";

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

export const ImageEditor: React.FC<ImageEditorProps> = (props) => {
  const {
    src,
    onSave,
    width = "100%",
    height = "100vh",
    validation,
    keepZoomOnSourceChange = false,
    config: userConfig,
    slots,
    events,
  } = props;
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

  // --- Zoom ---
  const zoom = useEditorZoom({ engineRef, engine });

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

  // Determine if a block is selected and its type
  const selectedBlockType =
    engine && selectedShapeId !== null
      ? (engine.block.getType(selectedShapeId) as "text" | "graphic" | string)
      : null;
  const blockEffects = useBlockEffects({
    engineRef,
    blockId: selectedBlockType === "image" ? selectedShapeId : null,
  });

  const { activeTool, activeToolId, handleSidebarToolSelect, handleDone, handleContextualReset } =
    useToolManager({
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

  // --- Keyboard shortcuts ---
  useShortcuts({
    enabled: !isLoading && !error,
    onToolSelect: handleSidebarToolSelect,
    onUndo: () => engineRef.current?.editor.undo(),
    onRedo: () => engineRef.current?.editor.redo(),
    onZoomIn: zoom.handleZoomIn,
    onZoomOut: zoom.handleZoomOut,
    onZoomFit: zoom.handleAutoFitPage,
    onZoom100: zoom.handleZoom100,
    onDuplicate: blockActions.duplicate,
    onBringForward: blockActions.bringForward,
    onSendBackward: blockActions.sendBackward,
    onBringToFront: blockActions.bringToFront,
    onSendToBack: blockActions.sendToBack,
    onEscape: () => {
      if (activeTool !== "select") {
        if (activeTool === "crop") {
          crop.handleCropCancel();
        } else {
          setActiveTool("select");
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

  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);

  const activeCustomTool = userConfig?.customTools?.find((t) => t.id === activeTool);

  const hasSelectedBlock =
    selectedBlockType === "text" ||
    selectedBlockType === "graphic" ||
    selectedBlockType === "image";

  const toolPanelOpen = activeTool !== "select" || propertySidePanel !== null;
  const effectivePanelTitle = useMemo(
    () =>
      propertySidePanel
        ? getPropertyPanelTitle(propertySidePanel)
        : getToolPanelTitle(activeTool, userConfig?.customTools),
    [propertySidePanel, activeTool, userConfig?.customTools],
  );

  // Reset property side panel when block is deselected
  useEffect(() => {
    if (!hasSelectedBlock && propertySidePanel !== null) {
      setPropertySidePanel(null);
    }
  }, [hasSelectedBlock, propertySidePanel, setPropertySidePanel]);

  return (
    <ImageEditorProvider config={userConfig}>
      <ThemeProvider theme={userConfig?.theme}>
        <I18nProvider locale={userConfig?.locale} translations={userConfig?.translations}>
          <TooltipProvider>
            <EditorShell style={{ width, height }} className="relative">
              {/* Drag/drop + paste wrapper */}
              <div
                className="flex flex-col h-full w-full"
                role="application"
                tabIndex={0}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onPaste={handlePaste}
              >
                <Topbar
                  onUndo={() => engineRef.current?.editor.undo()}
                  onRedo={() => engineRef.current?.editor.redo()}
                  canUndo={!!engine}
                  canRedo={!!engine}
                  onZoomIn={zoom.handleZoomIn}
                  onZoomOut={zoom.handleZoomOut}
                  onAutoFitPage={zoom.handleAutoFitPage}
                  onFitPage={zoom.handleFitPage}
                  onFitSelection={zoom.handleFitSelection}
                  canFitSelection={selectedShapeId !== null}
                  onZoomPreset={zoom.handleZoomPreset}
                  zoomLabel={zoom.zoomLabel}
                  onExport={handleExport}
                  isExporting={isExporting}
                  topbarRight={slots?.topbarRight}
                />

                <div className="flex flex-col-reverse @3xl/editor:flex-row flex-1 overflow-hidden">
                  <ToolNav
                    activeTool={activeToolId}
                    onToolSelect={handleSidebarToolSelect}
                    sidebarBottom={slots?.sidebarBottom}
                  />

                  <ToolPanel
                    open={toolPanelOpen}
                    title={effectivePanelTitle}
                    onClose={() => {
                      if (propertySidePanel) {
                        setPropertySidePanel(null);
                      } else if (activeTool === "crop") {
                        crop.handleCropCancel();
                      } else {
                        setActiveTool("select");
                      }
                    }}
                  >
                    {propertySidePanel && engine && selectedShapeId !== null ? (
                      <PropertySubPanels
                        panel={propertySidePanel}
                        engine={engine}
                        blockId={selectedShapeId}
                        blockType={selectedBlockType}
                        blockEffects={blockEffects}
                        blockActions={blockActions}
                        onReplaceImage={(file: File) =>
                          imageTool.handleReplaceImage(file, selectedShapeId)
                        }
                      />
                    ) : (
                      <ActiveToolContent
                        activeTool={activeTool}
                        crop={crop}
                        rotateFlip={rotateFlip}
                        adjustments={adjustments}
                        filter={filter}
                        shapes={shapes}
                        textTool={textTool}
                        imageTool={imageTool}
                        activeCustomToolPanel={activeCustomTool?.panel}
                      />
                    )}
                  </ToolPanel>

                  <CanvasSection
                    canvasRef={containerRef}
                    engine={engine}
                    activeTool={activeTool}
                    selectedShapeId={selectedShapeId}
                    selectedBlockType={selectedBlockType}
                    hasSelectedBlock={hasSelectedBlock}
                    blockActions={blockActions}
                    rotateFlip={rotateFlip}
                    imageTool={imageTool}
                    activeCustomToolBar={activeCustomTool?.contextualBar}
                    slots={slots}
                    onContextualReset={handleContextualReset}
                    onDone={handleDone}
                  />
                </div>
              </div>

              {isLoading && !error && <LoadingOverlay />}
              {error && <ErrorPlaceholder error={error} onRetry={handleRetry} />}
            </EditorShell>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ImageEditorProvider>
  );
};
