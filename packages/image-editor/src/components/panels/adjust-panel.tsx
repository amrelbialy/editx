import React from 'react';
import {
  ADJUSTMENT_CONFIG,
  type AdjustmentParam,
} from '@creative-editor/engine';

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
}> = ({ param, value, onChange }) => {
  const cfg = ADJUSTMENT_CONFIG[param];
  return (
    <div className="px-2 mb-1">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs text-gray-400">{LABELS[param]}</span>
        <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
          {formatValue(cfg.step, value)}
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(param, Number(e.target.value))}
        className="w-full accent-blue-500"
        data-testid={`adjust-${param}`}
      />
    </div>
  );
};

export const AdjustPanel: React.FC<AdjustPanelProps> = ({ values, onChange, onReset }) => {
  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 border-r border-gray-700 min-w-[200px] overflow-y-auto">
      <div className="text-xs text-gray-400 font-medium px-2 py-1">Basic</div>
      {BASIC_PARAMS.map((param) => (
        <AdjustSlider
          key={param}
          param={param}
          value={values[param]}
          onChange={onChange}
        />
      ))}

      <div className="text-xs text-gray-400 font-medium px-2 py-1 mt-2">Refinements</div>
      {REFINEMENT_PARAMS.map((param) => (
        <AdjustSlider
          key={param}
          param={param}
          value={values[param]}
          onChange={onChange}
        />
      ))}

      {/* Reset */}
      <div className="px-2 mt-2">
        <button
          onClick={onReset}
          data-testid="adjust-reset"
          className="w-full px-2 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors border border-gray-600"
        >
          Reset All
        </button>
      </div>
    </div>
  );
};
