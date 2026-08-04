import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useCallback } from "react";

export interface UseBlockTextFormatOptions {
  engine: EditxEngine;
  blockId: number;
  getStyleRange: () => { start: number; end: number };
  refresh: () => void;
  textSelectionRange: { from: number; to: number } | null;
}

/**
 * Text-mutation handlers for the properties toolbar. Every handler applies to
 * the current selection-aware style range and refreshes the toolbar state.
 */
export function useBlockTextFormat(options: UseBlockTextFormatOptions) {
  const { engine, blockId, getStyleRange, refresh, textSelectionRange } = options;

  const handleFontFamily = useCallback(
    (value: string) => {
      const { start, end } = getStyleRange();
      engine.block.setTextFontFamily(blockId, start, end, value);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleBoldToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleBoldText(blockId, start, end);
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  const handleItalicToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleItalicText(blockId, start, end);
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  const handleFontSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val) && val > 0) {
        const { start, end } = getStyleRange();
        engine.block.setTextFontSize(blockId, start, end, val);
        refresh();
      }
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleFontSizePreset = useCallback(
    (size: number) => {
      const { start, end } = getStyleRange();
      engine.block.setTextFontSize(blockId, start, end, size);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleTextAlign = useCallback(
    (align: string) => {
      engine.block.setTextAlign(blockId, align);
      refresh();
    },
    [engine, blockId, refresh],
  );

  const handleUnderlineToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    const runs = engine.block.getTextRuns(blockId);
    let currentDeco = "";
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > (textSelectionRange?.from ?? 0)) {
        currentDeco = run.style.textDecoration ?? "";
        break;
      }
      offset += run.text.length;
    }
    const hasUnderline = currentDeco.includes("underline");
    const parts = currentDeco.split(" ").filter((d) => d && d !== "underline");
    if (!hasUnderline) parts.push("underline");
    engine.block.setTextStyle(blockId, start, end, {
      textDecoration: parts.join(" ") || undefined,
    });
    refresh();
  }, [engine, blockId, getStyleRange, textSelectionRange, refresh]);

  const handleStrikethroughToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    const runs = engine.block.getTextRuns(blockId);
    let currentDeco = "";
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > (textSelectionRange?.from ?? 0)) {
        currentDeco = run.style.textDecoration ?? "";
        break;
      }
      offset += run.text.length;
    }
    const hasStrikethrough = currentDeco.includes("line-through");
    const parts = currentDeco.split(" ").filter((d) => d && d !== "line-through");
    if (!hasStrikethrough) parts.push("line-through");
    engine.block.setTextStyle(blockId, start, end, {
      textDecoration: parts.join(" ") || undefined,
    });
    refresh();
  }, [engine, blockId, getStyleRange, textSelectionRange, refresh]);

  const handleClearFormatting = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.setTextStyle(blockId, start, end, {
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "",
      backgroundColor: "",
      textTransform: "none",
      textShadowColor: "",
      textShadowBlur: 0,
      textShadowOffsetX: 0,
      textShadowOffsetY: 0,
      textStrokeColor: "",
      textStrokeWidth: 0,
    });
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  return {
    handleFontFamily,
    handleBoldToggle,
    handleItalicToggle,
    handleFontSize,
    handleFontSizePreset,
    handleTextAlign,
    handleUnderlineToggle,
    handleStrikethroughToggle,
    handleClearFormatting,
  };
}
