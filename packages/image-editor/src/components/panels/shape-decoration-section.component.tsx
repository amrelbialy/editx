import { type Color, colorToHex, type EditxEngine, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import { enableStrokeWithDefaults } from "../../utils/enable-stroke";
import { ColorSwatch } from "../ui/color-swatch";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface ShapeDecorationSectionProps {
  engine: EditxEngine;
  blockId: number;
}

interface DecorationState {
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
}

function toHex(c: Color): string {
  return colorToHex(c).substring(0, 7);
}

function readState(engine: EditxEngine, blockId: number): DecorationState {
  const b = engine.block;
  const sc = b.getShadowColor(blockId);
  return {
    strokeEnabled: b.isStrokeEnabled(blockId),
    strokeColor: toHex(b.getStrokeColor(blockId)),
    strokeWidth: b.getStrokeWidth(blockId),
    shadowEnabled: b.isShadowEnabled(blockId),
    shadowColor: sc ? toHex(sc) : "#000000",
    shadowOffsetX: b.getShadowOffsetX(blockId),
    shadowOffsetY: b.getShadowOffsetY(blockId),
    shadowBlur: b.getShadowBlur(blockId),
  };
}

/** Stroke + shadow controls for graphic blocks. Extracted from the shape
 *  properties panel to keep both files under the 250-line limit. */
export const ShapeDecorationSection: React.FC<ShapeDecorationSectionProps> = (props) => {
  const { engine, blockId } = props;

  const shapes = useConfig().shapes;

  const [state, setState] = useState<DecorationState>(() => readState(engine, blockId));

  useEffect(() => {
    setState(readState(engine, blockId));
  }, [engine, blockId]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readState(engine, blockId)));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readState(engine, blockId)), [engine, blockId]);

  const handleStrokeToggle = useCallback(() => {
    if (state.strokeEnabled) {
      engine.block.setStrokeEnabled(blockId, false);
    } else {
      enableStrokeWithDefaults(engine, blockId, {
        color: shapes?.defaultStrokeColor,
        width: shapes?.defaultStrokeWidth,
      });
    }
    update();
  }, [engine, blockId, state.strokeEnabled, update, shapes]);

  const handleStrokeColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setStrokeColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleStrokeWidth = useCallback(
    ([v]: number[]) => {
      engine.block.setStrokeWidth(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowToggle = useCallback(() => {
    engine.block.setShadowEnabled(blockId, !state.shadowEnabled);
    update();
  }, [engine, blockId, state.shadowEnabled, update]);

  const handleShadowColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowOffset = useCallback(
    (axis: "x" | "y", e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      if (Number.isNaN(v)) return;
      if (axis === "x") engine.block.setShadowOffsetX(blockId, v);
      else engine.block.setShadowOffsetY(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowBlur = useCallback(
    ([v]: number[]) => {
      engine.block.setShadowBlur(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  return (
    <>
      <Separator />

      <SwitchField
        label="Enable Stroke"
        checked={state.strokeEnabled}
        onChange={handleStrokeToggle}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ColorSwatch value={state.strokeColor} onChange={handleStrokeColor} />
            <span className="text-fluid font-mono text-muted-foreground">{state.strokeColor}</span>
          </div>
          <SliderField
            label="Width"
            value={state.strokeWidth}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => handleStrokeWidth([v])}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>
      </SwitchField>

      <Separator />

      <SwitchField
        label="Enable Shadow"
        checked={state.shadowEnabled}
        onChange={handleShadowToggle}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ColorSwatch value={state.shadowColor} onChange={handleShadowColor} />
            <span className="text-fluid font-mono text-muted-foreground">{state.shadowColor}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              label="X"
              value={state.shadowOffsetX}
              onChange={(e) => handleShadowOffset("x", e)}
            />
            <Input
              type="number"
              label="Y"
              value={state.shadowOffsetY}
              onChange={(e) => handleShadowOffset("y", e)}
            />
          </div>
          <SliderField
            label="Blur"
            value={state.shadowBlur}
            min={0}
            max={50}
            step={1}
            onChange={(v) => handleShadowBlur([v])}
          />
        </div>
      </SwitchField>
    </>
  );
};
