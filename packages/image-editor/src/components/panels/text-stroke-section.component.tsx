import type { EditxEngine, StrokeGradient, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { ColorPicker, Section, SegmentedControl, SliderField } from "../ui";
import { getColorOpacity, toOpaqueHexColor, withColorOpacity } from "../ui/color-value";
import { GradientControls } from "./gradient-controls.component";

type StrokeMode = "color" | "gradient";

export interface TextStrokeSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed stroke style (selection start). */
  selectionStart?: number;
  swatches?: string[];
}

interface StrokeState {
  mode: StrokeMode;
  color: string;
  opacity: number;
  width: number;
  gradientAngle: number;
  gradientStart: string;
  gradientEnd: string;
  gradientOpacity: number;
}

type GradientDraft = Pick<
  StrokeState,
  "gradientAngle" | "gradientStart" | "gradientEnd" | "gradientOpacity"
>;

function restoreGradientDraft(state: StrokeState, draft: GradientDraft | null): StrokeState {
  return state.mode === "color" && draft ? { ...state, ...draft } : state;
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
  const color = style.textStrokeColor ?? "#ffffff";
  const gradient = style.textStrokeGradient;
  const first = gradient?.stops[0]?.color ?? color;
  const last = gradient?.stops[gradient.stops.length - 1]?.color ?? "#000000";
  return {
    mode: gradient ? "gradient" : "color",
    color,
    opacity: getColorOpacity(color),
    width: style.textStrokeWidth ?? 0,
    gradientAngle: gradient?.angle ?? 0,
    gradientStart: toOpaqueHexColor(first),
    gradientEnd: toOpaqueHexColor(last),
    gradientOpacity: getColorOpacity(first),
  };
}

/** Per-run text stroke (colour + width). Extracted from the advanced panel to
 *  keep both files under the 250-line limit. */
export const TextStrokeSection: React.FC<TextStrokeSectionProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart, swatches } = props;

  const stateRef = useRef<StrokeState | null>(null);
  const userModeRef = useRef<StrokeMode | null>(null);
  const gradientDraftRef = useRef<GradientDraft | null>(null);

  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState<StrokeState>(() =>
    readStroke(engine, blockId, selectionStart),
  );
  stateRef.current = state;
  if (state.mode === "gradient") {
    const { gradientAngle, gradientStart, gradientEnd, gradientOpacity } = state;
    gradientDraftRef.current = { gradientAngle, gradientStart, gradientEnd, gradientOpacity };
  }

  const applyGradient = useCallback(
    (next: StrokeState) => {
      const { start, end } = getStyleRange();
      const gradient: StrokeGradient = {
        type: "linear",
        angle: next.gradientAngle,
        stops: [
          { offset: 0, color: withColorOpacity(next.gradientStart, next.gradientOpacity) },
          { offset: 1, color: withColorOpacity(next.gradientEnd, next.gradientOpacity) },
        ],
      };
      commit(() =>
        engine.block.setTextStroke(blockId, start, end, {
          gradient,
          width: next.width,
        }),
      );
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleMode = useCallback(
    (mode: StrokeMode) => {
      const current = stateRef.current;
      if (!current || current.mode === mode) return;
      userModeRef.current = mode;
      const next = { ...current, mode };
      if (mode === "gradient") {
        applyGradient(next);
      } else {
        const { start, end } = getStyleRange();
        commit(() => engine.block.setTextStroke(blockId, start, end, { gradient: null }));
      }
      setState(next);
    },
    [engine, blockId, getStyleRange, applyGradient, commit],
  );

  useEffect(() => {
    userModeRef.current = null;
    gradientDraftRef.current = null;
    setState(readStroke(engine, blockId, selectionStart));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => {
      const fresh = restoreGradientDraft(
        readStroke(engine, blockId, selectionStart),
        gradientDraftRef.current,
      );
      const preferred = userModeRef.current;
      if (preferred && fresh.mode !== preferred) {
        setState({ ...fresh, mode: preferred });
        return;
      }
      userModeRef.current = null;
      setState(fresh);
    });
  }, [engine, blockId, selectionStart]);

  const handleColor = useCallback(
    (color: string) => {
      const { start, end } = getStyleRange();
      const value = withColorOpacity(color, state.opacity);
      commit(() =>
        engine.block.setTextStroke(blockId, start, end, {
          color: value,
          width: state.width || 1,
        }),
      );
      setState((current) => ({ ...current, color: value, width: current.width || 1 }));
    },
    [engine, blockId, getStyleRange, state.opacity, state.width, commit],
  );

  const handleOpacity = useCallback(
    (opacity: number) => {
      const { start, end } = getStyleRange();
      const color = withColorOpacity(state.color, opacity);
      commit(() =>
        engine.block.setTextStroke(blockId, start, end, { color, width: state.width || 1 }),
      );
      setState((current) => ({ ...current, color, opacity, width: current.width || 1 }));
    },
    [engine, blockId, getStyleRange, state.color, state.width, commit],
  );

  const handleWidth = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      commit(() =>
        engine.block.setTextStroke(blockId, start, end, { color: state.color, width: v }),
      );
      setState((s) => ({ ...s, width: v }));
    },
    [engine, blockId, getStyleRange, state.color, commit],
  );

  const handleGradient = useCallback(
    (patch: Partial<StrokeState>) => {
      const current = stateRef.current;
      if (!current) return;
      const next = { ...current, ...patch };
      applyGradient(next);
      setState(next);
    },
    [applyGradient],
  );

  return (
    <Section label="Text Stroke">
      <div className="flex flex-col gap-3">
        <SegmentedControl<StrokeMode>
          ariaLabel="Text stroke kind"
          value={state.mode}
          onValueChange={handleMode}
          options={[
            { value: "color", label: "Color" },
            { value: "gradient", label: "Gradient" },
          ]}
        />
        {state.mode === "color" ? (
          <ColorPicker
            color={state.color}
            opacity={state.opacity}
            swatches={swatches}
            onChange={handleColor}
            onOpacityChange={handleOpacity}
          />
        ) : (
          <GradientControls
            type="linear"
            angle={state.gradientAngle}
            startColor={state.gradientStart}
            endColor={state.gradientEnd}
            opacity={state.gradientOpacity}
            showTypeControl={false}
            onTypeChange={() => undefined}
            onAngleChange={(gradientAngle) => handleGradient({ gradientAngle })}
            onStartColorChange={(gradientStart) => handleGradient({ gradientStart })}
            onEndColorChange={(gradientEnd) => handleGradient({ gradientEnd })}
            onOpacityChange={(gradientOpacity) => handleGradient({ gradientOpacity })}
          />
        )}
        <SliderField
          label="Width"
          value={state.width}
          min={0}
          max={5}
          step={0.5}
          onChange={(v) => handleWidth([v])}
          onCommit={flush}
          formatValue={(v) => v.toFixed(1)}
        />
      </div>
    </Section>
  );
};
