import type { EditxEngine, TextCurveDirection } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Section } from "../ui/section";
import { SegmentedControl } from "../ui/segmented-control";
import { SliderField } from "../ui/slider-field";

export interface TextCurveSectionProps {
  engine: EditxEngine;
  blockId: number;
}

interface CurveState {
  radius: number;
  direction: TextCurveDirection;
}

function readCurve(engine: EditxEngine, blockId: number): CurveState {
  const curve = engine.block.getTextCurve(blockId);
  return { radius: curve?.radius ?? 0, direction: curve?.direction ?? "up" };
}

/** Curve radius + direction control for a text block. radius 0 = flat. */
export const TextCurveSection: React.FC<TextCurveSectionProps> = (props) => {
  const { engine, blockId } = props;

  const { t } = useTranslation();

  const [state, setState] = useState<CurveState>(() => readCurve(engine, blockId));

  useEffect(() => {
    setState(readCurve(engine, blockId));
  }, [engine, blockId]);

  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readCurve(engine, blockId)));
  }, [engine, blockId]);

  const apply = useCallback(
    (radius: number, direction: TextCurveDirection) => {
      engine.block.setTextCurve(blockId, radius, direction);
      setState({ radius, direction });
    },
    [engine, blockId],
  );

  return (
    <Section label={t("curve.title")}>
      <div className="flex flex-col gap-2">
        <SegmentedControl<TextCurveDirection>
          ariaLabel={t("curve.title")}
          value={state.direction}
          onValueChange={(direction) => apply(state.radius, direction)}
          options={[
            { value: "up", label: t("curve.up") },
            { value: "down", label: t("curve.down") },
          ]}
        />
        <SliderField
          label={t("curve.radius")}
          value={state.radius}
          min={0}
          max={600}
          step={10}
          onChange={(v) => apply(v, state.direction)}
        />
      </div>
    </Section>
  );
};
