import type { AdjustmentParam, ShapeType } from "@creative-editor/engine";
import type React from "react";
import type { ImageEditorTool } from "../../store/image-editor-store";
import type { CropPresetId } from "../../store/image-editor-store";
import type { AdjustmentValues } from "../panels/adjust-panel";
import { AdjustPanel } from "../panels/adjust-panel";
import { CropPanel } from "../panels/crop-panel";
import { FilterPanel } from "../panels/filter-panel";
import { ImagePanel } from "../panels/image-panel";
import { RotatePanel } from "../panels/rotate-panel";
import { ShapesPanel } from "../panels/shapes-panel";
import { TextPanel } from "../panels/text-panel";
import type { TextPreset } from "../../hooks/use-text-tool";

interface ActiveToolContentProps {
  activeTool: ImageEditorTool;
  crop: {
    handleCropPresetChange: (preset: CropPresetId) => void;
    handleResizeDimensions: (w: number, h: number) => void;
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
  shapes: {
    handleAddShape: (shape: ShapeType, sides?: number) => void;
  };
  textTool: {
    handleAddText: (preset?: TextPreset) => void;
  };
  imageTool: {
    handleAddImage: (file: File) => Promise<void>;
  };
  activeCustomToolPanel?: React.ComponentType;
}

export const ActiveToolContent: React.FC<ActiveToolContentProps> = (props) => {
  const {
    activeTool,
    crop,
    rotateFlip,
    adjustments,
    filter,
    shapes,
    textTool,
    imageTool,
    activeCustomToolPanel: CustomPanel,
  } = props;

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
      return <ShapesPanel onAddShape={shapes.handleAddShape} />;
    case "text":
      return <TextPanel onAddText={textTool.handleAddText} />;
    case "image":
      return <ImagePanel onAddImage={imageTool.handleAddImage} />;
    default:
      if (CustomPanel) return <CustomPanel />;
      return null;
  }
};
