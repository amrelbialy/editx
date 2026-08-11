import type { EditxEngine, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { ColorSwatch } from "../ui/color-swatch";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface TextShadowSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed shadow style (selection start). */
  selectionStart?: number;
}

interface ShadowState {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

function readShadow(engine: EditxEngine, blockId: number, selectionStart?: number): ShadowState {
  const runs = engine.block.getTextRuns(blockId);
  let style: TextRunStyle = runs[0]?.style ?? {};
  if (selectionStart != null && selectionStart > 0) {
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > selectionStart) {
        style = run.style;
        break;
      }
      offset += run.text.length;
    }
  }
  const color = style.textShadowColor ?? "";
  const blur = style.textShadowBlur ?? 0;
  const offsetX = style.textShadowOffsetX ?? 0;
  const offsetY = style.textShadowOffsetY ?? 0;
  return {
    enabled: color !== "" || blur !== 0 || offsetX !== 0 || offsetY !== 0,
    color: color || "#000000",
    blur,
    offsetX,
    offsetY,
  };
}

/** Per-run text shadow (colour + blur + offset), selection-aware. Mirrors
 *  `TextStrokeSection` — writes the run style so it stays the single source of
 *  truth for text (no separate block-level Konva shadow). */
export const TextShadowSection: React.FC<TextShadowSectionProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart } = props;

  const [state, setState] = useState<ShadowState>(() =>
    readShadow(engine, blockId, selectionStart),
  );

  const { commit, flush } = useCoalescedHistory(engine);

  useEffect(() => {
    setState(readShadow(engine, blockId, selectionStart));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readShadow(engine, blockId, selectionStart)));
  }, [engine, blockId, selectionStart]);

  const handleToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    if (state.enabled) {
      engine.block.setTextShadow(blockId, start, end, {
        color: "",
        blur: 0,
        offsetX: 0,
        offsetY: 0,
      });
      setState((s) => ({ ...s, enabled: false }));
    } else {
      engine.block.setTextShadow(blockId, start, end, {
        color: "#000000",
        blur: 4,
        offsetX: 2,
        offsetY: 2,
      });
      setState({ enabled: true, color: "#000000", blur: 4, offsetX: 2, offsetY: 2 });
    }
  }, [engine, blockId, getStyleRange, state.enabled]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { start, end } = getStyleRange();
      const value = e.target.value;
      commit(() => engine.block.setTextShadow(blockId, start, end, { color: value }));
      setState((s) => ({ ...s, color: value }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleBlur = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      commit(() => engine.block.setTextShadow(blockId, start, end, { blur: v }));
      setState((s) => ({ ...s, blur: v }));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleOffset = useCallback(
    (axis: "offsetX" | "offsetY", e: React.ChangeEvent<HTMLInputElement>) => {
      const { start, end } = getStyleRange();
      const v = parseFloat(e.target.value) || 0;
      commit(() => engine.block.setTextShadow(blockId, start, end, { [axis]: v }));
      setState((s) => ({ ...s, [axis]: v }));
    },
    [engine, blockId, getStyleRange, commit],
  );

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
            onChange={(e) => handleOffset("offsetX", e)}
            onBlur={flush}
          />
          <Input
            type="number"
            label="Y"
            value={Math.round(state.offsetY)}
            onChange={(e) => handleOffset("offsetY", e)}
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
