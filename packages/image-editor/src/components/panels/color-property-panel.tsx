import type { EditxEngine } from "@editx/engine";
import { colorToHex, FILL_SOLID_COLOR, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ColorPicker } from "../ui/color-picker";

interface ColorPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic";
}

export const ColorPropertyPanel: React.FC<ColorPropertyPanelProps> = ({
  engine,
  blockId,
  blockType,
}) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === "text";
  const hasCharSelection =
    isText &&
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const readColor = useCallback(() => {
    if (isText) {
      const runs = engine.block.getTextRuns(blockId);
      let targetStyle = runs[0]?.style ?? {};
      if (textSelectionRange?.from != null && textSelectionRange.from > 0) {
        let offset = 0;
        for (const run of runs) {
          if (offset + run.text.length > textSelectionRange.from) {
            targetStyle = run.style;
            break;
          }
          offset += run.text.length;
        }
      }
      return targetStyle.fill ?? "#000000";
    }
    const fillId = engine.block.getFill(blockId);
    if (fillId != null) {
      const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
      if (c) return colorToHex(c).substring(0, 7);
    }
    return "#4a90e2";
  }, [engine, blockId, isText, textSelectionRange]);

  const [color, setColor] = useState(readColor);
  const [opacity, setOpacity] = useState(() => engine.block.getOpacity(blockId));

  useEffect(() => {
    setColor(readColor());
    setOpacity(engine.block.getOpacity(blockId));
  }, [readColor, engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => {
      setColor(readColor());
      setOpacity(engine.block.getOpacity(blockId));
    });
  }, [readColor, engine, blockId]);

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    if (isText) {
      return { start: 0, end: engine.block.getTextContent(blockId).length };
    }
    return { start: 0, end: 0 };
  }, [engine, blockId, hasCharSelection, isText, textSelectionRange]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      if (isText) {
        const { start, end } = getStyleRange();
        engine.block.setTextColor(blockId, start, end, newColor);
      } else {
        const fillId = engine.block.getFill(blockId);
        if (fillId != null) {
          engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(newColor));
        }
      }
      setColor(newColor);
    },
    [engine, blockId, isText, getStyleRange],
  );

  const handleOpacityChange = useCallback(
    (v: number) => {
      engine.block.setOpacity(blockId, v);
      setOpacity(v);
    },
    [engine, blockId],
  );

  return (
    <ColorPicker
      color={color}
      opacity={opacity}
      onChange={handleColorChange}
      onOpacityChange={handleOpacityChange}
    />
  );
};
