import type { EditxEngine, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ColorSwatch } from "../ui/color-swatch";
import { Section } from "../ui/section";
import { SliderField } from "../ui/slider-field";

export interface TextStrokeSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed stroke style (selection start). */
  selectionStart?: number;
}

interface StrokeState {
  color: string;
  width: number;
}

function readStroke(engine: EditxEngine, blockId: number, selectionStart?: number): StrokeState {
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
  return { color: style.textStrokeColor ?? "#ffffff", width: style.textStrokeWidth ?? 0 };
}

/** Per-run text stroke (colour + width). Extracted from the advanced panel to
 *  keep both files under the 250-line limit. */
export const TextStrokeSection: React.FC<TextStrokeSectionProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart } = props;

  const [state, setState] = useState<StrokeState>(() =>
    readStroke(engine, blockId, selectionStart),
  );

  useEffect(() => {
    setState(readStroke(engine, blockId, selectionStart));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readStroke(engine, blockId, selectionStart)));
  }, [engine, blockId, selectionStart]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStroke(blockId, start, end, {
        color: e.target.value,
        width: state.width || 1,
      });
      setState((s) => ({ ...s, color: e.target.value, width: s.width || 1 }));
    },
    [engine, blockId, getStyleRange, state.width],
  );

  const handleWidth = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStroke(blockId, start, end, { color: state.color, width: v });
      setState((s) => ({ ...s, width: v }));
    },
    [engine, blockId, getStyleRange, state.color],
  );

  return (
    <Section label="Text Stroke">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-fluid text-muted-foreground w-12">Color</span>
          <ColorSwatch value={state.color} onChange={handleColor} />
          <span className="text-fluid font-mono text-muted-foreground">{state.color}</span>
        </div>
        <SliderField
          label="Width"
          value={state.width}
          min={0}
          max={5}
          step={0.5}
          onChange={(v) => handleWidth([v])}
          formatValue={(v) => v.toFixed(1)}
        />
      </div>
    </Section>
  );
};
