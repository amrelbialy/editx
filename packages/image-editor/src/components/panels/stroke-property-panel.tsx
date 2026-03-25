import type { CreativeEngine } from "@creative-editor/engine";
import { colorToHex, hexToColor } from "@creative-editor/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

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

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    const handler = () => setState(readStroke(engine, blockId));
    engine.on("history:undo", handler);
    engine.on("history:redo", handler);
    return () => {
      engine.off("history:undo", handler);
      engine.off("history:redo", handler);
    };
  }, [engine, blockId]);

  const update = useCallback(() => setState(readStroke(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(() => {
    engine.block.setStrokeEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setStrokeColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleWidth = useCallback(
    ([v]: number[]) => {
      engine.block.setStrokeWidth(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  return (
    <SwitchField label="Enable Stroke" checked={state.enabled} onChange={handleToggle}>
      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-base text-muted-foreground">Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={state.color}
            onChange={handleColor}
            className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
          />
          <span className="text-base font-mono text-muted-foreground">{state.color}</span>
        </div>
      </div>

      {/* Width */}
      <SliderField
        label="Width"
        value={state.width}
        min={0}
        max={20}
        step={0.5}
        onChange={(v) => handleWidth([v])}
        formatValue={(v) => v.toFixed(1)}
      />
    </SwitchField>
  );
};
