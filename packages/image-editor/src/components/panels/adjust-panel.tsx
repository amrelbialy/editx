import React from 'react';
import {
  ADJUSTMENT_CONFIG,
  type AdjustmentParam,
} from '@creative-editor/engine';
import { RotateCcw } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

const BASIC_PARAMS: AdjustmentParam[] = [
  'brightness', 'saturation', 'contrast', 'gamma',
];

const REFINEMENT_PARAMS: AdjustmentParam[] = [
  'clarity', 'exposure', 'shadows', 'highlights', 'blacks', 'whites', 'temperature', 'sharpness',
];

const LABELS: Record<AdjustmentParam, string> = {
  brightness: 'Brightness',
  saturation: 'Saturation',
  contrast: 'Contrast',
  gamma: 'Gamma',
  clarity: 'Clarity',
  exposure: 'Exposure',
  shadows: 'Shadows',
  highlights: 'Highlights',
  blacks: 'Blacks',
  whites: 'Whites',
  temperature: 'Temperature',
  sharpness: 'Sharpness',
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

const AdjustSlider: React.FC<{
  param: AdjustmentParam;
  value: number;
  onChange: (key: AdjustmentParam, value: number) => void;
  onCommit?: (key: AdjustmentParam, value: number) => void;
}> = ({ param, value, onChange, onCommit }) => {
  const cfg = ADJUSTMENT_CONFIG[param];
  return (
    <div className="mb-1">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-muted-foreground">{LABELS[param]}</span>
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {formatValue(cfg.step, value)}
        </span>
      </div>
      <Slider
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={[value]}
        onValueChange={([v]) => onChange(param, v)}
        onValueCommit={onCommit ? ([v]) => onCommit(param, v) : undefined}
        data-testid={`adjust-${param}`}
      />
    </div>
  );
};

export const AdjustPanel: React.FC<AdjustPanelProps> = ({ values, onChange, onCommit, onReset }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-muted-foreground">Basic</div>
      {BASIC_PARAMS.map((param) => (
        <AdjustSlider
          key={param}
          param={param}
          value={values[param]}
          onChange={onChange}
          onCommit={onCommit}
        />
      ))}

      <Separator className="my-1" />

      <div className="text-xs font-medium text-muted-foreground">Refinements</div>
      {REFINEMENT_PARAMS.map((param) => (
        <AdjustSlider
          key={param}
          param={param}
          value={values[param]}
          onChange={onChange}
          onCommit={onCommit}
        />
      ))}

      <Separator className="my-1" />

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={onReset}
        data-testid="adjust-reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset All
      </Button>
    </div>
  );
};
