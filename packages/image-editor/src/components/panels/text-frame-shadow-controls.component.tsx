import type { EditxEngine } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { ColorSwatch } from "../ui/color-swatch";
import { toOpaqueHexColor } from "../ui/color-value";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface TextFrameShadowControlsProps {
  engine: EditxEngine;
  blockId: number;
}

interface FrameShadowState {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

function readShadow(engine: EditxEngine, blockId: number): FrameShadowState {
  const color = engine.block.getShadowColor(blockId);
  return {
    enabled: engine.block.isShadowEnabled(blockId),
    color: color ? toOpaqueHexColor(colorToHex(color)) : "#000000",
    offsetX: engine.block.getShadowOffsetX(blockId),
    offsetY: engine.block.getShadowOffsetY(blockId),
    blur: engine.block.getShadowBlur(blockId),
  };
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const TextFrameShadowControls: React.FC<TextFrameShadowControlsProps> = (props) => {
  const { engine, blockId } = props;

  const { t } = useTranslation();
  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState(() => readShadow(engine, blockId));

  const refresh = useCallback(() => setState(readShadow(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      flush();
      engine.block.setShadowEnabled(blockId, enabled);
      refresh();
    },
    [engine, blockId, flush, refresh],
  );

  const handleColor = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      commit(() => engine.block.setShadowColor(blockId, hexToColor(event.target.value)));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handleOffset = useCallback(
    (axis: "x" | "y", value: number) => {
      commit(() => {
        if (axis === "x") engine.block.setShadowOffsetX(blockId, value);
        else engine.block.setShadowOffsetY(blockId, value);
      });
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handleBlur = useCallback(
    (blur: number) => {
      commit(() => engine.block.setShadowBlur(blockId, blur));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  useEffect(refresh, [refresh]);
  useEffect(() => engine.onHistoryChanged(refresh), [engine, refresh]);

  return (
    <SwitchField
      label={t("textBackground.frameShadow")}
      checked={state.enabled}
      onChange={handleToggle}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-fluid text-muted-foreground">
            {t("textBackground.shadowColor")}
          </span>
          <ColorSwatch
            aria-label={t("textBackground.shadowColor")}
            value={state.color}
            onChange={handleColor}
            onBlur={flush}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            label={t("textBackground.shadowX")}
            aria-label={t("textBackground.shadowX")}
            value={state.offsetX}
            onChange={(event) => handleOffset("x", toNumber(event.target.value))}
            onBlur={flush}
          />
          <Input
            type="number"
            label={t("textBackground.shadowY")}
            aria-label={t("textBackground.shadowY")}
            value={state.offsetY}
            onChange={(event) => handleOffset("y", toNumber(event.target.value))}
            onBlur={flush}
          />
        </div>
        <SliderField
          label={t("textBackground.shadowBlur")}
          value={state.blur}
          min={0}
          max={50}
          step={1}
          onChange={handleBlur}
          onCommit={flush}
        />
      </div>
    </SwitchField>
  );
};
