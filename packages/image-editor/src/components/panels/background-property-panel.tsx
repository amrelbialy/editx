import type { EditxEngine } from "@editx/engine";
import { colorToHex, FILL_COLOR, FILL_SOLID_COLOR, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ColorPicker } from "../ui/color-picker";
import { toOpaqueHexColor } from "../ui/color-value";
import { SwitchField } from "../ui/switch-field";
import { TextBackgroundSection } from "./text-background-section.component";

interface BackgroundPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic" | "image";
}

function readFillState(engine: EditxEngine, blockId: number) {
  const fillEnabled = engine.block.isFillEnabled(blockId);
  let color = "#000000";
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) color = toOpaqueHexColor(colorToHex(c));
  } else {
    // Text blocks don't have fill sub-blocks; read FILL_COLOR directly
    const c = engine.block.getColor(blockId, FILL_COLOR);
    if (c) color = toOpaqueHexColor(colorToHex(c));
  }
  return { enabled: fillEnabled, color };
}

export const BackgroundPropertyPanel: React.FC<BackgroundPropertyPanelProps> = ({
  engine,
  blockId,
  blockType,
}) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === "text";

  const [state, setState] = useState(() => readFillState(engine, blockId));

  const config = useConfig();

  useEffect(() => {
    setState(readFillState(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readFillState(engine, blockId)));
  }, [engine, blockId]);

  const refresh = useCallback(() => setState(readFillState(engine, blockId)), [engine, blockId]);

  const { commit } = useCoalescedHistory(engine);

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

  const handleToggle = useCallback(() => {
    engine.block.setFillEnabled(blockId, !state.enabled);
    refresh();
  }, [engine, blockId, state.enabled, refresh]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      commit(() => {
        const fillId = engine.block.getFill(blockId);
        if (fillId != null) {
          engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(newColor));
        } else {
          // Text blocks: set fill color directly on the block
          engine.block.setColor(blockId, FILL_COLOR, hexToColor(newColor));
        }
        if (!state.enabled) {
          engine.block.setFillEnabled(blockId, true);
        }
      });
      refresh();
    },
    [engine, blockId, state.enabled, refresh, commit],
  );

  // Text blocks store the highlight as the RUN's `backgroundColor` (the pill
  // behind the glyphs), selection-aware — distinct from a graphic block's
  // whole-box fill handled below.
  if (isText) {
    return (
      <TextBackgroundSection
        engine={engine}
        blockId={blockId}
        getStyleRange={getStyleRange}
        selectionStart={textSelectionRange?.from}
        swatches={config.colors}
      />
    );
  }

  return (
    <SwitchField label="Enable Background" checked={state.enabled} onChange={handleToggle}>
      <ColorPicker
        color={state.color}
        swatches={config.colors}
        onChange={handleColorChange}
        showHexInput={false}
      />
    </SwitchField>
  );
};
