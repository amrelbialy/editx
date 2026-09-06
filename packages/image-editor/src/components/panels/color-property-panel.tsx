import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useImageEditorStore } from "../../store/image-editor-store";
import { TextColorSection } from "./text-color-section.component";

interface ColorPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
}

export const ColorPropertyPanel: React.FC<ColorPropertyPanelProps> = ({ engine, blockId }) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const config = useConfig();

  const hasCharSelection =
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const [opacity, setOpacity] = useState(() => engine.block.getOpacity(blockId));

  const { commit } = useCoalescedHistory(engine);

  useEffect(() => {
    setOpacity(engine.block.getOpacity(blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => {
      setOpacity(engine.block.getOpacity(blockId));
    });
  }, [engine, blockId]);

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  const handleOpacityChange = useCallback(
    (v: number) => {
      commit(() => engine.block.setOpacity(blockId, v));
      setOpacity(v);
    },
    [engine, blockId, commit],
  );

  return (
    <TextColorSection
      engine={engine}
      blockId={blockId}
      getStyleRange={getStyleRange}
      selectionStart={textSelectionRange?.from}
      opacity={opacity}
      onOpacityChange={handleOpacityChange}
      swatches={config.colors}
    />
  );
};
