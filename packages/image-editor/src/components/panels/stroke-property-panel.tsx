import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useCallback } from "react";
import { useConfig } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { GraphicStrokeControls } from "./graphic-stroke-controls.component";
import { TextStrokeSection } from "./text-stroke-section.component";

interface StrokePropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic" | "image";
  enabled?: boolean;
}

export const StrokePropertyPanel: React.FC<StrokePropertyPanelProps> = (props) => {
  const { engine, blockId, blockType, enabled } = props;
  const config = useConfig();
  const shapes = config.shapes;

  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === "text";

  const hasCharSelection =
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  // Text blocks store stroke in the run style (single source of truth); the
  // existing per-run section handles read/write selection-aware. Graphic/image
  // keep the block-level Konva stroke below.
  if (isText) {
    return (
      <TextStrokeSection
        engine={engine}
        blockId={blockId}
        getStyleRange={getStyleRange}
        selectionStart={textSelectionRange?.from}
        swatches={config.colors}
      />
    );
  }

  return (
    <GraphicStrokeControls
      engine={engine}
      blockId={blockId}
      blockType={blockType}
      enabled={enabled}
      swatches={config.colors}
      defaultColor={shapes?.defaultStrokeColor}
      defaultWidth={shapes?.defaultStrokeWidth}
    />
  );
};
