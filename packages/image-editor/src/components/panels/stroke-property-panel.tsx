import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { colorToHex, hexToColor } from '@creative-editor/engine';
import { Slider } from '../ui/slider';

interface StrokePropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface StrokeState {
  enabled: boolean;
  color: string;
  width: number;
}

function readStroke(engine: CreativeEngine, blockId: number): StrokeState {
  return {
    enabled: engine.block.isStrokeEnabled(blockId),
    color: colorToHex(engine.block.getStrokeColor(blockId)).substring(0, 7),
    width: engine.block.getStrokeWidth(blockId),
  };
}

export const StrokePropertyPanel: React.FC<StrokePropertyPanelProps> = ({ engine, blockId }) => {
  const [state, setState] = useState(() => readStroke(engine, blockId));

  useEffect(() => {
    setState(readStroke(engine, blockId));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readStroke(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(() => {
    engine.block.setStrokeEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    engine.block.setStrokeColor(blockId, hexToColor(e.target.value));
    update();
  }, [engine, blockId, update]);

  const handleWidth = useCallback(([v]: number[]) => {
    engine.block.setStrokeWidth(blockId, v);
    update();
  }, [engine, blockId, update]);

  return (
    <div className="flex flex-col gap-4">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">Enable Stroke</span>
      </label>

      {state.enabled && (
        <>
          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.color}
                onChange={handleColor}
                className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-muted-foreground">{state.color}</span>
            </div>
          </div>

          {/* Width */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Width</span>
            <div className="flex items-center gap-2">
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[state.width]}
                onValueChange={handleWidth}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                {state.width.toFixed(1)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
