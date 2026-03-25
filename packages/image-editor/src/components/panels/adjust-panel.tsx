import { ADJUSTMENT_CONFIG, type AdjustmentParam } from "@creative-editor/engine";
import { RotateCcw } from "lucide-react";
import type React from "react";
import { Button } from "../ui/button";
import { Section } from "../ui/section";
import { SliderField } from "../ui/slider-field";

const BASIC_PARAMS: AdjustmentParam[] = ["brightness", "saturation", "contrast", "gamma"];

const REFINEMENT_PARAMS: AdjustmentParam[] = [
  "clarity",
  "exposure",
  "shadows",
  "highlights",
  "blacks",
  "whites",
  "temperature",
  "sharpness",
];

const LABELS: Record<AdjustmentParam, string> = {
  brightness: "Brightness",
  saturation: "Saturation",
  contrast: "Contrast",
  gamma: "Gamma",
  clarity: "Clarity",
  exposure: "Exposure",
  shadows: "Shadows",
  highlights: "Highlights",
  blacks: "Blacks",
  whites: "Whites",
  temperature: "Temperature",
  sharpness: "Sharpness",
};

export type AdjustmentValues = Record<AdjustmentParam, number>;

export interface AdjustPanelProps {
  values: AdjustmentValues;
  onChange: (key: AdjustmentParam, value: number) => void;
  onCommit?: (key: AdjustmentParam, value: number) => void;
  onReset: () => void;
}

function formatValue(step: number, v: number): string {
  if (step >= 1) return String(Math.round(v));
  return v.toFixed(2);
}

export const AdjustPanel: React.FC<AdjustPanelProps> = ({
  values,
  onChange,
  onCommit,
  onReset,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <Section label="Basic">
        <div className="flex flex-col gap-2">
          {BASIC_PARAMS.map((param) => {
            const cfg = ADJUSTMENT_CONFIG[param];
            return (
              <SliderField
                key={param}
                label={LABELS[param]}
                value={values[param]}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                onChange={(v) => onChange(param, v)}
                onCommit={onCommit ? (v) => onCommit(param, v) : undefined}
                formatValue={(v) => formatValue(cfg.step, v)}
                data-testid={`adjust-${param}`}
              />
            );
          })}
        </div>
      </Section>

      <Section label="Refinements" separator>
        <div className="flex flex-col gap-2">
          {REFINEMENT_PARAMS.map((param) => {
            const cfg = ADJUSTMENT_CONFIG[param];
            return (
              <SliderField
                key={param}
                label={LABELS[param]}
                value={values[param]}
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                onChange={(v) => onChange(param, v)}
                onCommit={onCommit ? (v) => onCommit(param, v) : undefined}
                formatValue={(v) => formatValue(cfg.step, v)}
                data-testid={`adjust-${param}`}
              />
            );
          })}
        </div>
      </Section>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={onReset}
        data-testid="adjust-reset"
      >
        <RotateCcw className="h-4 w-4" />
        Reset All
      </Button>
    </div>
  );
};
