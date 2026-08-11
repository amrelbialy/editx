import type { EditxEngine } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ColorSwatch } from "../ui/color-swatch";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";
import { TextShadowSection } from "./text-shadow-section.component";

interface ShadowPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic" | "image";
}

interface ShadowState {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

function readShadow(engine: EditxEngine, blockId: number): ShadowState {
  const sc = engine.block.getShadowColor(blockId);
  return {
    enabled: engine.block.isShadowEnabled(blockId),
    color: sc ? colorToHex(sc).substring(0, 7) : "#000000",
    offsetX: engine.block.getShadowOffsetX(blockId),
    offsetY: engine.block.getShadowOffsetY(blockId),
    blur: engine.block.getShadowBlur(blockId),
  };
}

export const ShadowPropertyPanel: React.FC<ShadowPropertyPanelProps> = ({
  engine,
  blockId,
  blockType,
}) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === "text";

  const [state, setState] = useState(() => readShadow(engine, blockId));

  useEffect(() => {
    setState(readShadow(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readShadow(engine, blockId)));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readShadow(engine, blockId)), [engine, blockId]);

  const { commit, flush } = useCoalescedHistory(engine);

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
    engine.block.setShadowEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      commit(() => engine.block.setShadowColor(blockId, hexToColor(value)));
      update();
    },
    [engine, blockId, update, commit],
  );

  const handleOffsetX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value) || 0;
      commit(() => engine.block.setShadowOffsetX(blockId, v));
      update();
    },
    [engine, blockId, update, commit],
  );

  const handleOffsetY = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value) || 0;
      commit(() => engine.block.setShadowOffsetY(blockId, v));
      update();
    },
    [engine, blockId, update, commit],
  );

  const handleBlur = useCallback(
    ([v]: number[]) => {
      commit(() => engine.block.setShadowBlur(blockId, v));
      update();
    },
    [engine, blockId, update, commit],
  );

  // Text blocks store shadow in the run style (single source of truth) so the
  // panel and the per-run renderer never disagree; graphic/image keep the
  // block-level Konva shadow below.
  if (isText) {
    return (
      <TextShadowSection
        engine={engine}
        blockId={blockId}
        getStyleRange={getStyleRange}
        selectionStart={textSelectionRange?.from}
      />
    );
  }

  return (
    <SwitchField label="Enable Shadow" checked={state.enabled} onChange={handleToggle}>
      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid text-muted-foreground">Color</span>
        <div className="flex items-center gap-2">
          <ColorSwatch value={state.color} onChange={handleColor} />
          <span className="text-fluid font-mono text-muted-foreground">{state.color}</span>
        </div>
      </div>

      {/* Offset */}
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid text-muted-foreground">Offset</span>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            label="X"
            value={Math.round(state.offsetX)}
            onChange={handleOffsetX}
            onBlur={flush}
          />
          <Input
            type="number"
            label="Y"
            value={Math.round(state.offsetY)}
            onChange={handleOffsetY}
            onBlur={flush}
          />
        </div>
      </div>

      {/* Blur */}
      <SliderField
        label="Blur"
        value={state.blur}
        min={0}
        max={50}
        step={1}
        onChange={(v) => handleBlur([v])}
        onCommit={flush}
      />
    </SwitchField>
  );
};
