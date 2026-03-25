import type { AdjustmentParam, CreativeEngine, ShapeType } from "@creative-editor/engine";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { UseBlockActionsReturn } from "../../hooks/use-block-actions";
import type { TextPreset } from "../../hooks/use-text-tool";
import { useTranslation } from "../../i18n/i18n-context";
import type { CropPresetId, ImageEditorTool } from "../../store/image-editor-store";
import { useImageEditorStore } from "../../store/image-editor-store";
import type { AdjustmentValues } from "../panels/adjust-panel";
import { AdjustPanel } from "../panels/adjust-panel";
import { CropPanel } from "../panels/crop-panel";
import { FilterPanel } from "../panels/filter-panel";
import { ImagePanel } from "../panels/image-panel";
import { RotatePanel } from "../panels/rotate-panel";
import { ShapesPanel } from "../panels/shapes-panel";
import { TextPanel } from "../panels/text-panel";
import { BlockInspector } from "./block-inspector";
import { getPropertyPanelTitleKey, getToolPanelTitle, getToolPanelTitleKey } from "./panel-titles";
import { ToolPanel } from "./tool-panel";

interface SidePanelProps {
  engine: CreativeEngine | null;
  selectedShapeId: number | null;
  selectedBlockType: string | null;
  activeTool: ImageEditorTool;
  crop: {
    handleCropPresetChange: (preset: CropPresetId) => void;
    handleResizeDimensions: (w: number, h: number) => void;
    handleCropCancel: () => void;
    cropDimensions: { width: number; height: number } | null;
  };
  rotateFlip: {
    rotationState: { rotation: number; flipH: boolean; flipV: boolean };
    handleRotationChange: (v: number) => void;
    handleRotateClockwise: () => void;
    handleRotateCounterClockwise: () => void;
    handleFlipHorizontal: () => void;
    handleFlipVertical: () => void;
    handleRotateReset: () => void;
  };
  adjustments: {
    adjustValues: AdjustmentValues;
    handleAdjustChange: (key: AdjustmentParam, value: number) => void;
    handleAdjustCommit: () => void;
    handleAdjustReset: () => void;
  };
  filter: {
    activeFilter: string;
    handleFilterSelect: (filter: string) => void;
  };
  addShape: (shape: ShapeType, sides?: number) => void;
  addText: (preset?: TextPreset) => void;
  addImage: (file: File) => Promise<void>;
  replaceImage: (file: File, blockId: number) => Promise<void>;
  blockEffects: {
    adjustValues: AdjustmentValues;
    handleAdjustChange: (key: AdjustmentParam, value: number) => void;
    handleAdjustCommit: () => void;
    handleAdjustReset: () => void;
    activeFilter: string;
    handleFilterSelect: (filter: string) => void;
  };
  blockActions: UseBlockActionsReturn;
  activeCustomToolPanel?: React.ComponentType;
  customTools?: Array<{ id: string; label: string }>;
}

export const SidePanel: React.FC<SidePanelProps> = (props) => {
  const {
    engine,
    selectedShapeId,
    selectedBlockType,
    activeTool,
    crop,
    rotateFlip,
    adjustments,
    filter,
    addShape,
    addText,
    addImage,
    replaceImage,
    blockEffects,
    blockActions,
    activeCustomToolPanel: CustomPanel,
    customTools,
  } = props;

  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const { t } = useTranslation();

  const hasSelectedBlock =
    selectedBlockType === "text" ||
    selectedBlockType === "graphic" ||
    selectedBlockType === "image";

  // Reset property side panel when block is deselected
  useEffect(() => {
    if (!hasSelectedBlock && propertySidePanel !== null) {
      setPropertySidePanel(null);
    }
  }, [hasSelectedBlock, propertySidePanel, setPropertySidePanel]);

  const open = activeTool !== "select" || propertySidePanel !== null;

  const title = useMemo(() => {
    if (propertySidePanel) {
      const key = getPropertyPanelTitleKey(propertySidePanel);
      return key ? t(key) : undefined;
    }
    const key = getToolPanelTitleKey(activeTool);
    if (key) return t(key);
    return getToolPanelTitle(activeTool, customTools);
  }, [propertySidePanel, activeTool, customTools, t]);

  const handleClose = useCallback(() => {
    if (propertySidePanel) {
      setPropertySidePanel(null);
    } else if (activeTool === "crop") {
      crop.handleCropCancel();
    } else {
      setActiveTool("select");
    }
  }, [propertySidePanel, setPropertySidePanel, activeTool, crop, setActiveTool]);

  // --- Tool content router ---
  const toolContent = useMemo(() => {
    switch (activeTool) {
      case "crop":
        return (
          <CropPanel
            onPresetChange={crop.handleCropPresetChange}
            onResizeDimensions={crop.handleResizeDimensions}
            cropDimensions={crop.cropDimensions}
          />
        );
      case "rotate":
        return (
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
        );
      case "adjust":
        return (
          <AdjustPanel
            values={adjustments.adjustValues}
            onChange={adjustments.handleAdjustChange}
            onCommit={adjustments.handleAdjustCommit}
            onReset={adjustments.handleAdjustReset}
          />
        );
      case "filter":
        return (
          <FilterPanel activeFilter={filter.activeFilter} onSelect={filter.handleFilterSelect} />
        );
      case "shapes":
        return <ShapesPanel onAddShape={addShape} />;
      case "text":
        return <TextPanel onAddText={addText} />;
      case "image":
        return <ImagePanel onAddImage={addImage} />;
      default:
        if (CustomPanel) return <CustomPanel />;
        return null;
    }
  }, [activeTool, crop, rotateFlip, adjustments, filter, addShape, addText, addImage, CustomPanel]);

  return (
    <ToolPanel open={open} title={title} onClose={handleClose}>
      {propertySidePanel && engine && selectedShapeId !== null ? (
        <BlockInspector
          panel={propertySidePanel}
          engine={engine}
          blockId={selectedShapeId}
          blockType={selectedBlockType}
          blockEffects={blockEffects}
          blockActions={blockActions}
          onReplaceImage={(file: File) => replaceImage(file, selectedShapeId)}
        />
      ) : (
        toolContent
      )}
    </ToolPanel>
  );
};
