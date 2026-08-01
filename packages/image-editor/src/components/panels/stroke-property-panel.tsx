import type { EditxEngine } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { ColorSwatch } from "../ui/color-swatch";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

interface StrokePropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
}

interface StrokeState {
  enabled: boolean;
  color: string;
  width: number;
}

function readStroke(engine: EditxEngine, blockId: number): StrokeState {
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
    return engine.onHistoryChanged(() => setState(readStroke(engine, blockId)));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readStroke(engine, blockId)), [engine, blockId]);

  const { commit, flush } = useCoalescedHistory(engine);

  const handleToggle = useCallback(() => {
    engine.block.setStrokeEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      commit(() => engine.block.setStrokeColor(blockId, hexToColor(value)));
      update();
    },
    [engine, blockId, update, commit],
  );

  const handleWidth = useCallback(
    ([v]: number[]) => {
      commit(() => engine.block.setStrokeWidth(blockId, v));
      update();
    },
    [engine, blockId, update, commit],
  );

  return (
    <SwitchField label="Enable Stroke" checked={state.enabled} onChange={handleToggle}>
      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid text-muted-foreground">Color</span>
        <div className="flex items-center gap-2">
          <ColorSwatch value={state.color} onChange={handleColor} />
          <span className="text-fluid font-mono text-muted-foreground">{state.color}</span>
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
        onCommit={flush}
        formatValue={(v) => v.toFixed(1)}
      />
    </SwitchField>
  );
};
