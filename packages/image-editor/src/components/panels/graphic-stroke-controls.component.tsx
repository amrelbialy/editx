import type { EditxEngine, StrokeGradient } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { cn } from "../../utils/cn";
import { enableStrokeWithDefaults } from "../../utils/enable-stroke";
import { ColorPicker, SegmentedControl, SliderField, SwitchField } from "../ui";
import { getColorOpacity, toOpaqueHexColor, withColorOpacity } from "../ui/color-value";
import { GradientControls } from "./gradient-controls.component";

type StrokeMode = "color" | "gradient";

interface GraphicStrokeControlsProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "graphic" | "image";
  enabled?: boolean;
  swatches?: string[];
  defaultColor?: string;
  defaultWidth?: number;
}

interface StrokeState {
  enabled: boolean;
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

function readStroke(engine: EditxEngine, blockId: number): StrokeState {
  const color = engine.block.getStrokeColor(blockId);
  const solid = toOpaqueHexColor(colorToHex(color));
  const gradient = engine.block.getStrokeGradient(blockId);
  const first = gradient?.stops[0]?.color ?? solid;
  const last = gradient?.stops[gradient.stops.length - 1]?.color ?? "#ffffff";
  return {
    enabled: engine.block.isStrokeEnabled(blockId),
    mode: gradient ? "gradient" : "color",
    color: solid,
    opacity: color.a,
    width: engine.block.getStrokeWidth(blockId),
    gradientAngle: gradient?.angle ?? 0,
    gradientStart: toOpaqueHexColor(first),
    gradientEnd: toOpaqueHexColor(last),
    gradientOpacity: getColorOpacity(first),
  };
}

export const GraphicStrokeControls: React.FC<GraphicStrokeControlsProps> = (props) => {
  const { engine, blockId, blockType, enabled, swatches, defaultColor, defaultWidth } = props;
  const supportsGradient = blockType === "graphic";

  const stateRef = useRef<StrokeState | null>(null);
  const userModeRef = useRef<StrokeMode | null>(null);
  const gradientDraftRef = useRef<GradientDraft | null>(null);

  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState(() => readStroke(engine, blockId));
  stateRef.current = state;
  if (state.mode === "gradient") {
    const { gradientAngle, gradientStart, gradientEnd, gradientOpacity } = state;
    gradientDraftRef.current = { gradientAngle, gradientStart, gradientEnd, gradientOpacity };
  }

  const applyGradient = useCallback(
    (next: StrokeState) => {
      const gradient: StrokeGradient = {
        type: "linear",
        angle: next.gradientAngle,
        stops: [
          { offset: 0, color: withColorOpacity(next.gradientStart, next.gradientOpacity) },
          { offset: 1, color: withColorOpacity(next.gradientEnd, next.gradientOpacity) },
        ],
      };
      commit(() => engine.block.setStrokeGradient(blockId, gradient));
    },
    [engine, blockId, commit],
  );

  const handleToggle = useCallback(() => {
    if (state.enabled) engine.block.setStrokeEnabled(blockId, false);
    else enableStrokeWithDefaults(engine, blockId, { color: defaultColor, width: defaultWidth });
    setState(readStroke(engine, blockId));
  }, [engine, blockId, state.enabled, defaultColor, defaultWidth]);

  const handleMode = useCallback(
    (mode: StrokeMode) => {
      const current = stateRef.current;
      if (!current || current.mode === mode) return;
      userModeRef.current = mode;
      const next = { ...current, mode };
      if (mode === "gradient") applyGradient(next);
      else commit(() => engine.block.setStrokeGradient(blockId, null));
      setState(next);
    },
    [engine, blockId, applyGradient, commit],
  );

  const handleColor = useCallback(
    (color: string) => {
      const current = stateRef.current;
      if (!current) return;
      commit(() =>
        engine.block.setStrokeColor(blockId, { ...hexToColor(color), a: current.opacity }),
      );
      setState({ ...current, color });
    },
    [engine, blockId, commit],
  );

  const handleOpacity = useCallback(
    (opacity: number) => {
      const current = stateRef.current;
      if (!current) return;
      commit(() =>
        engine.block.setStrokeColor(blockId, { ...hexToColor(current.color), a: opacity }),
      );
      setState({ ...current, opacity });
    },
    [engine, blockId, commit],
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

  const handleWidth = useCallback(
    (width: number) => {
      commit(() => engine.block.setStrokeWidth(blockId, width));
      setState((current) => ({ ...current, width }));
    },
    [engine, blockId, commit],
  );

  useEffect(() => {
    userModeRef.current = null;
    gradientDraftRef.current = null;
    setState(readStroke(engine, blockId));
  }, [engine, blockId]);
  useEffect(
    () =>
      engine.onHistoryChanged(() => {
        const fresh = restoreGradientDraft(readStroke(engine, blockId), gradientDraftRef.current);
        const preferred = userModeRef.current;
        if (preferred && fresh.mode !== preferred) {
          setState({ ...fresh, mode: preferred });
          return;
        }
        userModeRef.current = null;
        setState(fresh);
      }),
    [engine, blockId],
  );

  const controls = (
    <>
      {supportsGradient && (
        <SegmentedControl<StrokeMode>
          ariaLabel="Stroke kind"
          value={state.mode}
          onValueChange={handleMode}
          options={[
            { value: "color", label: "Color" },
            { value: "gradient", label: "Gradient" },
          ]}
        />
      )}
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
        max={20}
        step={0.5}
        onChange={handleWidth}
        onCommit={flush}
        formatValue={(value) => value.toFixed(1)}
      />
    </>
  );

  if (blockType === "image") {
    return (
      <SwitchField label="Enable Stroke" checked={state.enabled} onChange={handleToggle}>
        {controls}
      </SwitchField>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", !(enabled ?? state.enabled) && "opacity-50")}>
      {controls}
    </div>
  );
};
