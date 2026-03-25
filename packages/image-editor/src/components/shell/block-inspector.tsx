import type { AdjustmentParam, CreativeEngine } from "@creative-editor/engine";
import type React from "react";
import type { AlignDirection } from "../../hooks/use-block-actions";
import type { PropertySidePanel } from "../../store/image-editor-store";
import type { AdjustmentValues } from "../panels/adjust-panel";
import { AdjustPanel } from "../panels/adjust-panel";
import { BackgroundPropertyPanel } from "../panels/background-property-panel";
import { ColorPropertyPanel } from "../panels/color-property-panel";
import { FilterPanel } from "../panels/filter-panel";
import { ImageFillPanel } from "../panels/image-fill-panel";
import { PositionPropertyPanel } from "../panels/position-property-panel";
import { ShadowPropertyPanel } from "../panels/shadow-property-panel";
import { StrokePropertyPanel } from "../panels/stroke-property-panel";
import { TextAdvancedPanel } from "../panels/text-advanced-panel";

interface BlockInspectorProps {
  panel: PropertySidePanel;
  engine: CreativeEngine;
  blockId: number;
  blockType: string | null;
  blockEffects: {
    adjustValues: AdjustmentValues;
    handleAdjustChange: (key: AdjustmentParam, value: number) => void;
    handleAdjustCommit: () => void;
    handleAdjustReset: () => void;
    activeFilter: string;
    handleFilterSelect: (filter: string) => void;
  };
  blockActions: {
    bringForward: () => void;
    sendBackward: () => void;
    bringToFront: () => void;
    sendToBack: () => void;
    alignToPage: (direction: AlignDirection) => void;
  };
  onReplaceImage: (file: File) => void;
}

export const BlockInspector: React.FC<BlockInspectorProps> = (props) => {
  const { panel, engine, blockId, blockType, blockEffects, blockActions, onReplaceImage } = props;

  if (!panel) return null;

  switch (panel) {
    case "color":
      return (
        <ColorPropertyPanel
          engine={engine}
          blockId={blockId}
          blockType={blockType as "text" | "graphic"}
        />
      );
    case "background":
      return <BackgroundPropertyPanel engine={engine} blockId={blockId} />;
    case "shadow":
      return <ShadowPropertyPanel engine={engine} blockId={blockId} />;
    case "stroke":
      return <StrokePropertyPanel engine={engine} blockId={blockId} />;
    case "position":
      return (
        <PositionPropertyPanel
          engine={engine}
          blockId={blockId}
          onBringForward={blockActions.bringForward}
          onSendBackward={blockActions.sendBackward}
          onBringToFront={blockActions.bringToFront}
          onSendToBack={blockActions.sendToBack}
          onAlign={blockActions.alignToPage}
        />
      );
    case "text-advanced":
      if (blockType !== "text") return null;
      return <TextAdvancedPanel engine={engine} blockId={blockId} />;
    case "adjust":
      if (blockType !== "image") return null;
      return (
        <AdjustPanel
          values={blockEffects.adjustValues}
          onChange={blockEffects.handleAdjustChange}
          onCommit={blockEffects.handleAdjustCommit}
          onReset={blockEffects.handleAdjustReset}
        />
      );
    case "filter":
      if (blockType !== "image") return null;
      return (
        <FilterPanel
          activeFilter={blockEffects.activeFilter}
          onSelect={blockEffects.handleFilterSelect}
        />
      );
    case "imageFill":
      if (blockType !== "image") return null;
      return <ImageFillPanel engine={engine} blockId={blockId} onReplace={onReplaceImage} />;
    default:
      return null;
  }
};
