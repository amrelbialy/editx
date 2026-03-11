import { useCallback, useRef, useState } from 'react';
import {
  ADJUSTMENT_CONFIG,
  ADJUSTMENT_PARAMS,
  type AdjustmentParam,
  type CreativeEngine,
} from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';
import type { AdjustmentValues } from '../components/panels/adjust-panel';

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0, saturation: 0, contrast: 0, gamma: 0,
  clarity: 0, exposure: 0, shadows: 0, highlights: 0,
  blacks: 0, whites: 0, temperature: 0, sharpness: 0,
};

export interface UseAdjustmentsToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useAdjustmentsTool({ engineRef }: UseAdjustmentsToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const adjustEffectIdRef = useRef<number | null>(null);
  const [adjustValues, setAdjustValues] = useState<AdjustmentValues>(DEFAULT_ADJUSTMENTS);

  const ensureAdjustEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === 'adjustments') {
        adjustEffectIdRef.current = eid;
        return eid;
      }
    }

    const eid = ce.block.createEffect('adjustments');
    ce.block.appendEffect(editableBlockId, eid);
    adjustEffectIdRef.current = eid;
    return eid;
  }, [engineRef, editableBlockId]);

  const syncAdjustValues = useCallback(() => {
    const ce = engineRef.current;
    const eid = adjustEffectIdRef.current;
    if (!ce || eid === null) {
      setAdjustValues(DEFAULT_ADJUSTMENTS);
      return;
    }

    const vals = {} as AdjustmentValues;
    for (const param of ADJUSTMENT_PARAMS) {
      vals[param] = ce.block.getFloat(eid, ADJUSTMENT_CONFIG[param].key);
    }
    setAdjustValues(vals);
  }, [engineRef]);

  const handleAdjustChange = useCallback((param: AdjustmentParam, value: number) => {
    const ce = engineRef.current;
    const eid = adjustEffectIdRef.current;
    if (!ce || eid === null) return;

    ce.block.setFloat(eid, ADJUSTMENT_CONFIG[param].key, value);
    setAdjustValues((prev) => ({ ...prev, [param]: value }));
  }, [engineRef]);

  const handleAdjustReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const effects = ce.block.getEffects(editableBlockId);
    for (let i = effects.length - 1; i >= 0; i--) {
      if (ce.block.getKind(effects[i]) === 'adjustments') {
        ce.block.removeEffect(editableBlockId, i);
        break;
      }
    }

    const eid = ce.block.createEffect('adjustments');
    ce.block.appendEffect(editableBlockId, eid);
    adjustEffectIdRef.current = eid;
    setAdjustValues(DEFAULT_ADJUSTMENTS);
  }, [engineRef, editableBlockId]);

  return {
    adjustValues,
    ensureAdjustEffect,
    syncAdjustValues,
    handleAdjustChange,
    handleAdjustReset,
  };
}
