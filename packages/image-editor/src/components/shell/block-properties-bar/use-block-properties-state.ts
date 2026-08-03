import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { readBlockColor, readTextState } from "./state-readers";

export interface UseBlockPropertiesStateOptions {
  engine: EditxEngine;
  blockId: number;
  isText: boolean;
  isImage: boolean;
}

/**
 * Owns the reactive text/fill/opacity state for the properties toolbar and
 * keeps it in sync with the engine (selection changes + `onStateChanged`).
 * Also exposes the selection-aware style range used by mutation handlers.
 */
export function useBlockPropertiesState(options: UseBlockPropertiesStateOptions) {
  const { engine, blockId, isText, isImage } = options;

  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const [textState, setTextState] = useState(() =>
    isText ? readTextState(engine, blockId, textSelectionRange?.from) : null,
  );
  const [fillColor, setFillColor] = useState(() =>
    !isText && !isImage ? readBlockColor(engine, blockId) : "#000000",
  );
  const [opacity, setOpacity] = useState(() => engine.block.getOpacity(blockId));

  const refresh = useCallback(() => {
    if (isText) {
      setTextState(readTextState(engine, blockId, textSelectionRange?.from));
    } else if (!isImage) {
      setFillColor(readBlockColor(engine, blockId));
    }
    setOpacity(engine.block.getOpacity(blockId));
  }, [engine, blockId, isText, isImage, textSelectionRange]);

  // ── Selection-aware style range ──
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

  const handleOpacityChange = useCallback(
    ([v]: number[]) => {
      engine.block.setOpacity(blockId, v);
      setOpacity(v);
    },
    [engine, blockId],
  );

  // Sync on selection / block changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-read state when engine notifies of property changes on this block
  useEffect(() => {
    return engine.block.onStateChanged([blockId], refresh);
  }, [engine, blockId, refresh]);

  return {
    textState,
    fillColor,
    opacity,
    refresh,
    hasCharSelection,
    getStyleRange,
    handleOpacityChange,
    textSelectionRange,
  };
}
