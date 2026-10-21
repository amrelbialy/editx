import type React from "react";
import type { EditorSlots, ImageEditorConfig } from "../../config/config.types";
import type { useEngine } from "../../hooks/use-engine";
import type { UseHistoryResult } from "../../hooks/use-history";
import type { useTools } from "../../hooks/use-tools";
import type { useZoom } from "../../hooks/use-zoom";
import { CanvasPane } from "./canvas-pane";
import { SidePanel } from "./side-panel";
import { ToolNav } from "./tool-nav";
import { Topbar } from "./topbar";

interface EditorWorkspaceProps {
  engineState: ReturnType<typeof useEngine>;
  tools: ReturnType<typeof useTools>;
  zoom: ReturnType<typeof useZoom>;
  history: UseHistoryResult;
  config?: ImageEditorConfig;
  slots?: EditorSlots;
  onExport: () => void;
  isExporting: boolean;
  onClose?: () => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = (props) => {
  const { engineState, tools, zoom, history, config, slots, onExport, isExporting, onClose } =
    props;
  const { engine, containerRef, selectedShapeId, handleDragOver, handleDrop, handlePaste } =
    engineState;
  const activeCustomTool = config?.customTools?.find((tool) => tool.id === tools.activeTool);

  return (
    <div
      className="flex flex-col h-full w-full"
      role="application"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <Topbar
        onUndo={history.handleUndo}
        onRedo={history.handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onZoomIn={zoom.handleZoomIn}
        onZoomOut={zoom.handleZoomOut}
        onAutoFitPage={zoom.handleAutoFitPage}
        onFitPage={zoom.handleFitPage}
        onFitSelection={zoom.handleFitSelection}
        canFitSelection={selectedShapeId !== null}
        onZoomPreset={zoom.handleZoomPreset}
        zoomLabel={zoom.zoomLabel}
        onExport={onExport}
        isExporting={isExporting}
        topbarRight={slots?.topbarRight}
        onClose={onClose}
      />
      <div className="flex flex-col-reverse @xl/editor:flex-row flex-1 overflow-hidden">
        <ToolNav
          activeTool={tools.activeToolId}
          onToolSelect={tools.handleSidebarToolSelect}
          customTools={config?.customTools}
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
          addTextPreset={tools.addTextPreset}
          addShapePreset={tools.addShapePreset}
          addImage={tools.addImage}
          replaceImage={tools.replaceImage}
          blockEffects={tools.blockEffects}
          blockActions={tools.blockActions}
          activeCustomToolPanel={activeCustomTool?.panel}
          customTools={config?.customTools}
        />
        <CanvasPane
          canvasRef={containerRef}
          engine={engine}
          activeTool={tools.activeTool}
          selectedShapeId={selectedShapeId}
          selectedBlockType={tools.selectedBlockType}
          hasSelectedBlock={tools.hasSelectedBlock}
          blockActions={tools.blockActions}
          rotateFlip={tools.rotateFlip}
          replaceImage={tools.replaceImage}
          activeCustomToolBar={activeCustomTool?.contextualBar}
          slots={slots}
          onContextualReset={tools.handleContextualReset}
          onDone={tools.handleDone}
          onCropImageFill={tools.imageFillCrop.enter}
          onCropCancel={tools.crop.handleCropCancel}
          imageFillCrop={tools.imageFillCrop}
        />
      </div>
    </div>
  );
};
