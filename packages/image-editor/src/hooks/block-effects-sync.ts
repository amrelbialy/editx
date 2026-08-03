import { ADJUSTMENT_PARAMS, type EditxEngine, EFFECT_FILTER_NAME } from "@editx/engine";
import type React from "react";
import type { AdjustmentValues } from "../components/panels/adjust-panel";

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  saturation: 0,
  contrast: 0,
  gamma: 0,
  clarity: 0,
  exposure: 0,
  shadows: 0,
  highlights: 0,
  blacks: 0,
  whites: 0,
  temperature: 0,
  sharpness: 0,
};

export type EffectRefs = {
  adjust: React.RefObject<number | null>;
  filter: React.RefObject<number | null>;
};

export type EffectSetters = {
  setAdjustValues: React.Dispatch<React.SetStateAction<AdjustmentValues>>;
  setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
};

/**
 * Reads the block's current adjust/filter effects from the engine and pushes
 * them into local refs + React state. Shared by the blockId-change sync effect
 * and the undo/redo (`onHistoryChanged`) effect so the mapping lives once.
 */
export function syncFromEngine(
  ce: EditxEngine,
  blockId: number,
  refs: EffectRefs,
  setters: EffectSetters,
) {
  const effects = ce.block.getEffects(blockId);
  let foundAdjust = false;
  let foundFilter = false;
  for (const eid of effects) {
    const kind = ce.block.getKind(eid);
    if (kind === "adjustments") {
      refs.adjust.current = eid;
      const vals = {} as AdjustmentValues;
      for (const param of ADJUSTMENT_PARAMS) {
        vals[param] = ce.block.getAdjustmentValue(eid, param);
      }
      setters.setAdjustValues(vals);
      foundAdjust = true;
    } else if (kind === "filter") {
      refs.filter.current = eid;
      setters.setActiveFilter(ce.block.getString(eid, EFFECT_FILTER_NAME));
      foundFilter = true;
    }
  }
  if (!foundAdjust) {
    refs.adjust.current = null;
    setters.setAdjustValues(DEFAULT_ADJUSTMENTS);
  }
  if (!foundFilter) {
    refs.filter.current = null;
    setters.setActiveFilter("");
  }
}
