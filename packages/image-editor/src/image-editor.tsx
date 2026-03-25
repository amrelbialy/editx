import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ExportDialog } from "./components/panels/export-dialog";
import { announce } from "./components/shell/announcer";
import { CanvasPane } from "./components/shell/canvas-pane";
import { EditorShell } from "./components/shell/editor-shell";
import { ErrorPlaceholder } from "./components/shell/error-placeholder";
import { LoadingOverlay } from "./components/shell/loading-overlay";
import { getToolPanelTitle } from "./components/shell/panel-titles";
import { Providers } from "./components/shell/providers";
import { SidePanel } from "./components/shell/side-panel";
import { ToolNav } from "./components/shell/tool-nav";
import { Topbar } from "./components/shell/topbar";
import type { EditorEventCallbacks, EditorSlots, ImageEditorConfig } from "./config/config.types";
import { useEngine } from "./hooks/use-engine";
import { useExport } from "./hooks/use-export";
import { useShortcuts } from "./hooks/use-shortcuts";
import { useTools } from "./hooks/use-tools";
import { useZoom } from "./hooks/use-zoom";
import { useImageEditorStore } from "./store/image-editor-store";
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

  // --- Refs & custom hooks ---
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

  const tools = useTools({ engineRef, engine, selectedShapeId, setSelectedShapeId, events });
  const zoom = useZoom({ engineRef, engine });
  const { handleExport, isExporting } = useExport({
    engineRef,
    exportConfig: userConfig?.export,
    onSave,
    events,
    notify: tools.notify,
  });

  // --- Store selectors (grouped) ---
  const isLoading = useImageEditorStore((s) => s.isLoading);
  const error = useImageEditorStore((s) => s.error);

  // --- useState ---
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // --- useCallback ---
  const openExportDialog = useCallback(() => setExportDialogOpen(true), []);

  const handleUndo = useCallback(() => engineRef.current?.editor.undo(), [engineRef]);
  const handleRedo = useCallback(() => engineRef.current?.editor.redo(), [engineRef]);

  const handleEscape = useCallback(() => {
    if (tools.activeTool !== "select") {
      if (tools.activeTool === "crop") {
        tools.crop.handleCropCancel();
      } else {
        tools.setActiveTool("select");
      }
    }
  }, [tools]);

  // --- useEffect ---
  useShortcuts({
    enabled: !isLoading && !error,
    onToolSelect: tools.handleSidebarToolSelect,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onZoomIn: zoom.handleZoomIn,
    onZoomOut: zoom.handleZoomOut,
    onZoomFit: zoom.handleAutoFitPage,
    onZoom100: zoom.handleZoom100,
    onDuplicate: tools.duplicate,
    onBringForward: tools.blockActions.bringForward,
    onSendBackward: tools.blockActions.sendBackward,
    onBringToFront: tools.blockActions.bringToFront,
    onSendToBack: tools.blockActions.sendToBack,
    onEscape: handleEscape,
    onDelete: tools.deleteBlock,
  });

  useEffect(() => {
    if (tools.activeTool !== "select") {
      const title = getToolPanelTitle(tools.activeTool, userConfig?.customTools);
      if (title) announce(`${title} tool selected`);
    }
  }, [tools.activeTool, userConfig?.customTools]);

  // --- Derived state ---
  const activeCustomTool = userConfig?.customTools?.find((t) => t.id === tools.activeTool);

  const hasSelectedBlock =
    tools.selectedBlockType === "text" ||
    tools.selectedBlockType === "graphic" ||
    tools.selectedBlockType === "image";

  return (
    <Providers config={userConfig}>
      <EditorShell style={{ width, height }} className="relative">
        <div
          className="flex flex-col h-full w-full"
          role="application"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <Topbar
            onUndo={handleUndo}
            onRedo={handleRedo}
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
            onExport={openExportDialog}
            isExporting={isExporting}
            topbarRight={slots?.topbarRight}
          />

          <div className="flex flex-col-reverse @3xl/editor:flex-row flex-1 overflow-hidden">
            <ToolNav
              activeTool={tools.activeToolId}
              onToolSelect={tools.handleSidebarToolSelect}
              sidebarBottom={slots?.sidebarBottom}
            />

            <SidePanel
              engine={engine}
              selectedShapeId={selectedShapeId}
              selectedBlockType={tools.selectedBlockType}
              activeTool={tools.activeTool}
              crop={tools.crop}
              rotateFlip={tools.rotateFlip}
              adjustments={tools.adjustments}
              filter={tools.filter}
              addShape={tools.addShape}
              addText={tools.addText}
              addImage={tools.addImage}
              replaceImage={tools.replaceImage}
              blockEffects={tools.blockEffects}
              blockActions={tools.blockActions}
              activeCustomToolPanel={activeCustomTool?.panel}
              customTools={userConfig?.customTools}
            />

            <CanvasPane
              canvasRef={containerRef}
              engine={engine}
              activeTool={tools.activeTool}
              selectedShapeId={selectedShapeId}
              selectedBlockType={tools.selectedBlockType}
              hasSelectedBlock={hasSelectedBlock}
              blockActions={tools.blockActions}
              rotateFlip={tools.rotateFlip}
              replaceImage={tools.replaceImage}
              activeCustomToolBar={activeCustomTool?.contextualBar}
              slots={slots}
              onContextualReset={tools.handleContextualReset}
              onDone={tools.handleDone}
            />
          </div>
        </div>

        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {isLoading && !error && <LoadingOverlay />}
        {error && <ErrorPlaceholder error={error} onRetry={handleRetry} />}
      </EditorShell>
    </Providers>
  );
};
