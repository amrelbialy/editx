import type { CreativeEngine } from "@creative-editor/engine";
import { colorToHex, hexToColor } from "@creative-editor/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { InputGroup } from "../ui/input-group";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

interface ShadowPropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface ShadowState {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

function readShadow(engine: CreativeEngine, blockId: number): ShadowState {
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
    const handler = () => setState(readShadow(engine, blockId));
    engine.on("history:undo", handler);
    engine.on("history:redo", handler);
    return () => {
      engine.off("history:undo", handler);
      engine.off("history:redo", handler);
    };
  }, [engine, blockId]);

  const update = useCallback(() => setState(readShadow(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(() => {
    engine.block.setShadowEnabled(blockId, !state.enabled);
    update();
  }, [engine, blockId, state.enabled, update]);

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
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
      engine.block.setShadowBlur(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  return (
    <SwitchField label="Enable Shadow" checked={state.enabled} onChange={handleToggle}>
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

      {/* Offset */}
      <div className="flex flex-col gap-1.5">
        <span className="text-base text-muted-foreground">Offset</span>
        <div className="grid grid-cols-2 gap-2">
          <InputGroup label="X" value={Math.round(state.offsetX)} onChange={handleOffsetX} />
          <InputGroup label="Y" value={Math.round(state.offsetY)} onChange={handleOffsetY} />
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
      />
    </SwitchField>
  );
};
