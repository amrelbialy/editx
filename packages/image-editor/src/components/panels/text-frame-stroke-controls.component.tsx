import type { EditxEngine } from "@editx/engine";
import { colorToHex, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { useTranslation } from "../../i18n/i18n-context";
import { enableStrokeWithDefaults } from "../../utils/enable-stroke";
import { ColorSwatch } from "../ui/color-swatch";
import { toOpaqueHexColor } from "../ui/color-value";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface TextFrameStrokeControlsProps {
  engine: EditxEngine;
  blockId: number;
}

interface FrameStrokeState {
  enabled: boolean;
  color: string;
  width: number;
}

function readStroke(engine: EditxEngine, blockId: number): FrameStrokeState {
  return {
    enabled: engine.block.isStrokeEnabled(blockId),
    color: toOpaqueHexColor(colorToHex(engine.block.getStrokeColor(blockId))),
    width: engine.block.getStrokeWidth(blockId),
  };
}

export const TextFrameStrokeControls: React.FC<TextFrameStrokeControlsProps> = (props) => {
  const { engine, blockId } = props;

  const { t } = useTranslation();
  const shapes = useConfig().shapes;
  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState(() => readStroke(engine, blockId));

  const refresh = useCallback(() => setState(readStroke(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      flush();
      if (enabled) {
        enableStrokeWithDefaults(engine, blockId, {
          color: shapes?.defaultStrokeColor,
          width: shapes?.defaultStrokeWidth,
        });
      } else {
        engine.block.setStrokeEnabled(blockId, false);
      }
      refresh();
    },
    [engine, blockId, shapes?.defaultStrokeColor, shapes?.defaultStrokeWidth, flush, refresh],
  );

  const handleColor = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      commit(() => engine.block.setStrokeColor(blockId, hexToColor(event.target.value)));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  const handleWidth = useCallback(
    (width: number) => {
      commit(() => engine.block.setStrokeWidth(blockId, width));
      refresh();
    },
    [engine, blockId, commit, refresh],
  );

  useEffect(refresh, [refresh]);
  useEffect(() => engine.onHistoryChanged(refresh), [engine, refresh]);

  return (
    <SwitchField
      label={t("textBackground.frameStroke")}
      checked={state.enabled}
      onChange={handleToggle}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-fluid text-muted-foreground">
            {t("textBackground.strokeColor")}
          </span>
          <ColorSwatch
            aria-label={t("textBackground.strokeColor")}
            value={state.color}
            onChange={handleColor}
            onBlur={flush}
          />
        </div>
        <SliderField
          label={t("textBackground.strokeWidth")}
          value={state.width}
          min={0}
          max={20}
          step={0.5}
          onChange={handleWidth}
          onCommit={flush}
          formatValue={(value) => value.toFixed(1)}
        />
      </div>
    </SwitchField>
  );
};
