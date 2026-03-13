import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ADJUSTMENT_CONFIG,
  ADJUSTMENT_PARAMS,
  EFFECT_FILTER_NAME,
  type AdjustmentParam,
  type CreativeEngine,
} from '@creative-editor/engine';
import type { AdjustmentValues } from '../components/panels/adjust-panel';

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0, saturation: 0, contrast: 0, gamma: 0,
  clarity: 0, exposure: 0, shadows: 0, highlights: 0,
  blacks: 0, whites: 0, temperature: 0, sharpness: 0,
};

export interface UseBlockEffectsOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  blockId: number | null;
}

/**
 * Manages adjustments and filter effects for a specific block (e.g. image overlays).
 * Separate from the page-level useAdjustmentsTool / useFilterTool hooks.
 */
export function useBlockEffects({ engineRef, blockId }: UseBlockEffectsOptions) {
  const adjustEffectIdRef = useRef<number | null>(null);
  const filterEffectIdRef = useRef<number | null>(null);
  const [adjustValues, setAdjustValues] = useState<AdjustmentValues>(DEFAULT_ADJUSTMENTS);
  const [activeFilter, setActiveFilter] = useState('');

  // Sync state when blockId changes
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce || blockId === null) {
      adjustEffectIdRef.current = null;
      filterEffectIdRef.current = null;
      setAdjustValues(DEFAULT_ADJUSTMENTS);
      setActiveFilter('');
      return;
    }

    // Find existing adjust effect
    const effects = ce.block.getEffects(blockId);
    let foundAdjust = false;
    let foundFilter = false;
    for (const eid of effects) {
      const kind = ce.block.getKind(eid);
      if (kind === 'adjustments') {
        adjustEffectIdRef.current = eid;
        const vals = {} as AdjustmentValues;
        for (const param of ADJUSTMENT_PARAMS) {
          vals[param] = ce.block.getFloat(eid, ADJUSTMENT_CONFIG[param].key);
        }
        setAdjustValues(vals);
        foundAdjust = true;
      } else if (kind === 'filter') {
        filterEffectIdRef.current = eid;
        setActiveFilter(ce.block.getString(eid, EFFECT_FILTER_NAME));
        foundFilter = true;
      }
    }
    if (!foundAdjust) {
      adjustEffectIdRef.current = null;
      setAdjustValues(DEFAULT_ADJUSTMENTS);
    }
    if (!foundFilter) {
      filterEffectIdRef.current = null;
      setActiveFilter('');
    }
  }, [engineRef, blockId]);

  // --- Adjustments ---

  const ensureAdjustEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return null;
    if (adjustEffectIdRef.current !== null) return adjustEffectIdRef.current;

    const eid = ce.block.createEffect('adjustments');
    ce.block.appendEffect(blockId, eid);
    adjustEffectIdRef.current = eid;
    return eid;
  }, [engineRef, blockId]);

  const handleAdjustChange = useCallback((param: AdjustmentParam, value: number) => {
    const ce = engineRef.current;
    let eid = adjustEffectIdRef.current;
    if (!ce) return;
    if (eid === null) {
      eid = ensureAdjustEffect();
      if (eid === null) return;
    }
    ce.block.setFloat(eid, ADJUSTMENT_CONFIG[param].key, value);
    setAdjustValues((prev) => ({ ...prev, [param]: value }));
  }, [engineRef, ensureAdjustEffect]);

  const handleAdjustReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return;

    const effects = ce.block.getEffects(blockId);
    for (let i = effects.length - 1; i >= 0; i--) {
      if (ce.block.getKind(effects[i]) === 'adjustments') {
        ce.block.removeEffect(blockId, i);
        break;
      }
    }
    adjustEffectIdRef.current = null;
    setAdjustValues(DEFAULT_ADJUSTMENTS);
  }, [engineRef, blockId]);

  // --- Filters ---

  const ensureFilterEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return null;
    if (filterEffectIdRef.current !== null) return filterEffectIdRef.current;

    const eid = ce.block.createEffect('filter');
    ce.block.appendEffect(blockId, eid);
    filterEffectIdRef.current = eid;
    return eid;
  }, [engineRef, blockId]);

  const handleFilterSelect = useCallback((name: string) => {
    const ce = engineRef.current;
    let eid = filterEffectIdRef.current;
    if (!ce) return;
    if (eid === null) {
      eid = ensureFilterEffect();
      if (eid === null) return;
    }
    ce.block.setString(eid, EFFECT_FILTER_NAME, name);
    setActiveFilter(name);
  }, [engineRef, ensureFilterEffect]);

  return {
    adjustValues,
    activeFilter,
    handleAdjustChange,
    handleAdjustReset,
    handleFilterSelect,
  };
}
