import type { EditxEngine } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { ColorSwatch } from "../ui/color-swatch";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

interface ShadowPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
}

interface ShadowState {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

function readShadow(engine: EditxEngine, blockId: number): ShadowState {
  const sc = engine.block.getShadowColor(blockId);
  return {
    enabled: engine.block.isShadowEnabled(blockId),
    color: sc ? colorToHex(sc).substring(0, 7) : "#000000",
    offsetX: engine.block.getShadowOffsetX(blockId),
    offsetY: engine.block.getShadowOffsetY(blockId),
    blur: engine.block.getShadowBlur(blockId),
  };
}

export const ShadowPropertyPanel: React.FC<ShadowPropertyPanelProps> = ({ engine, blockId }) => {
  const [state, setState] = useState(() => readShadow(engine, blockId));

  useEffect(() => {
    setState(readShadow(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readShadow(engine, blockId)));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readShadow(engine, blockId)), [engine, blockId]);

  const { commit, flush } = useCoalescedHistory(engine);

  const handleToggle = useCallback(() => {
    engine.block.setShadowEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      commit(() => engine.block.setShadowColor(blockId, hexToColor(value)));
      update();
    },
    [engine, blockId, update, commit],
  );

  const handleOffsetX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowOffsetX(blockId, parseFloat(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleOffsetY = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowOffsetY(blockId, parseFloat(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleBlur = useCallback(
    ([v]: number[]) => {
      commit(() => engine.block.setShadowBlur(blockId, v));
      update();
    },
    [engine, blockId, update, commit],
  );

  return (
    <SwitchField label="Enable Shadow" checked={state.enabled} onChange={handleToggle}>
      {/* Color */}
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid text-muted-foreground">Color</span>
        <div className="flex items-center gap-2">
          <ColorSwatch value={state.color} onChange={handleColor} />
          <span className="text-fluid font-mono text-muted-foreground">{state.color}</span>
        </div>
      </div>

      {/* Offset */}
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid text-muted-foreground">Offset</span>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            label="X"
            value={Math.round(state.offsetX)}
            onChange={handleOffsetX}
          />
          <Input
            type="number"
            label="Y"
            value={Math.round(state.offsetY)}
            onChange={handleOffsetY}
          />
        </div>
      </div>

      {/* Blur */}
      <SliderField
        label="Blur"
        value={state.blur}
        min={0}
        max={50}
        step={1}
        onChange={(v) => handleBlur([v])}
        onCommit={flush}
      />
    </SwitchField>
  );
};
