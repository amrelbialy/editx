import type { EditxEngine, TextGradient, TextRunStyle } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { ColorPicker, ColorSwatch, Input, Section, SegmentedControl, SliderField } from "../ui";

type ColorMode = "solid" | "gradient";
type GradientType = "linear" | "radial";

export interface TextColorSectionProps {
  engine: EditxEngine;
  blockId: number;
  /** Character range the mutation applies to (whole block or selection). */
  getStyleRange: () => { start: number; end: number };
  /** Offset used to read the displayed run style (selection start). */
  selectionStart?: number;
  opacity: number;
  onOpacityChange: (value: number) => void;
  swatches?: string[];
}

interface ColorState {
  mode: ColorMode;
  solid: string;
  gradientType: GradientType;
  gradientAngle: number;
  gradientStart: string;
  gradientEnd: string;
}

function toHex(color: string): string {
  return color.startsWith("#") ? color.substring(0, 7) : color;
}

/** Lighten a solid colour toward white to seed a visible 2-stop gradient. */
function lighten(hex: string): string {
  const h = toHex(hex);
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return "#ffffff";
  const mix = (c: number) => Math.round(c + (255 - c) * 0.4);
  const r = mix(parseInt(h.slice(1, 3), 16));
  const g = mix(parseInt(h.slice(3, 5), 16));
  const b = mix(parseInt(h.slice(5, 7), 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function readColorState(engine: EditxEngine, blockId: number, selectionStart?: number): ColorState {
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
  const grad = style.fillGradient;
  const solid = toHex(style.fill ?? "#000000");
  return {
    mode: grad ? "gradient" : "solid",
    solid,
    gradientType: grad?.type ?? "linear",
    gradientAngle: grad?.angle ?? 90,
    gradientStart: toHex(grad?.stops[0]?.color ?? solid),
    gradientEnd: toHex(grad?.stops[grad.stops.length - 1]?.color ?? lighten(solid)),
  };
}

/**
 * Per-run text colour editor with Solid / Gradient modes, selection-aware.
 * Solid writes `setTextColor` (and clears any gradient); Gradient writes
 * `setTextGradient`. Mirrors the shape-fill gradient editor pattern.
 */
export const TextColorSection: React.FC<TextColorSectionProps> = (props) => {
  const { engine, blockId, getStyleRange, selectionStart, opacity, onOpacityChange, swatches } =
    props;

  const [state, setState] = useState<ColorState>(() =>
    readColorState(engine, blockId, selectionStart),
  );

  // Mirror of `state` so callbacks can read the latest values without listing
  // `state` as a dependency and without mutating the engine inside a setState
  // updater (which double-invokes under StrictMode).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tracks the mode the user explicitly picked so an async history re-read that
  // momentarily observes stale runs cannot flip the control back.
  const userModeRef = useRef<ColorMode | null>(null);

  const { commit } = useCoalescedHistory(engine);

  useEffect(() => {
    userModeRef.current = null;
    setState(readColorState(engine, blockId, selectionStart));
  }, [engine, blockId, selectionStart]);

  useEffect(() => {
    return engine.onHistoryChanged(() => {
      const fresh = readColorState(engine, blockId, selectionStart);
      // Honour the user's explicit mode choice when the re-read agrees or is
      // stale; only adopt a foreign mode once the engine confirms it.
      const preferred = userModeRef.current;
      if (preferred && fresh.mode !== preferred) {
        setState({ ...fresh, mode: preferred });
        return;
      }
      userModeRef.current = null;
      setState(fresh);
    });
  }, [engine, blockId, selectionStart]);

  const applyGradient = useCallback(
    (next: ColorState) => {
      const { start, end } = getStyleRange();
      const gradient: TextGradient = {
        type: next.gradientType,
        angle: next.gradientAngle,
        stops: [
          { offset: 0, color: next.gradientStart },
          { offset: 1, color: next.gradientEnd },
        ],
      };
      commit(() => engine.block.setTextGradient(blockId, start, end, gradient));
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleMode = useCallback(
    (mode: ColorMode) => {
      const { start, end } = getStyleRange();
      const current = stateRef.current;
      userModeRef.current = mode;
      if (mode === "solid") {
        commit(() => {
          engine.block.setTextGradient(blockId, start, end, null);
          engine.block.setTextColor(blockId, start, end, current.solid);
        });
        setState({ ...current, mode });
      } else {
        const next: ColorState = {
          ...current,
          mode,
          gradientStart: current.gradientStart || current.solid,
          gradientEnd: current.gradientEnd || lighten(current.solid),
        };
        applyGradient(next);
        setState(next);
      }
    },
    [engine, blockId, getStyleRange, applyGradient, commit],
  );

  const handleSolid = useCallback(
    (newColor: string) => {
      const { start, end } = getStyleRange();
      userModeRef.current = "solid";
      commit(() => {
        engine.block.setTextGradient(blockId, start, end, null);
        engine.block.setTextColor(blockId, start, end, newColor);
      });
      setState({ ...stateRef.current, mode: "solid", solid: newColor });
    },
    [engine, blockId, getStyleRange, commit],
  );

  const handleGradient = useCallback(
    (patch: Partial<ColorState>) => {
      const next = { ...stateRef.current, ...patch };
      applyGradient(next);
      setState(next);
    },
    [applyGradient],
  );

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl<ColorMode>
        ariaLabel="Colour mode"
        value={state.mode}
        onValueChange={handleMode}
        options={[
          { value: "solid", label: "Solid" },
          { value: "gradient", label: "Gradient" },
        ]}
      />

      {state.mode === "solid" ? (
        <ColorPicker
          color={state.solid}
          opacity={opacity}
          swatches={swatches}
          onChange={handleSolid}
          onOpacityChange={onOpacityChange}
        />
      ) : (
        <>
          <SegmentedControl<GradientType>
            ariaLabel="Gradient type"
            value={state.gradientType}
            onValueChange={(v) => handleGradient({ gradientType: v })}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
          />
          <Section label="Stops">
            <div className="flex items-center gap-2">
              <ColorSwatch
                value={state.gradientStart}
                onChange={(e) => handleGradient({ gradientStart: e.target.value })}
              />
              <ColorSwatch
                value={state.gradientEnd}
                onChange={(e) => handleGradient({ gradientEnd: e.target.value })}
              />
              {state.gradientType === "linear" && (
                <Input
                  type="number"
                  label="Angle"
                  value={state.gradientAngle}
                  min={0}
                  max={360}
                  className="flex-1"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) handleGradient({ gradientAngle: v });
                  }}
                />
              )}
            </div>
          </Section>
          <SliderField
            label="Opacity"
            value={Math.round(opacity * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => onOpacityChange(v / 100)}
          />
        </>
      )}
    </div>
  );
};
