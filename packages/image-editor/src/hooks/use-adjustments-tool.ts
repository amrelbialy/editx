import { ADJUSTMENT_PARAMS, type AdjustmentParam, type EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdjustmentValues } from "../components/panels/adjust-panel";
import { useImageEditorStore } from "../store/image-editor-store";

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
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

export interface UseAdjustmentsToolOptions {
  engineRef: React.RefObject<EditxEngine | null>;
}

export function useAdjustmentsTool({ engineRef }: UseAdjustmentsToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const adjustEffectIdRef = useRef<number | null>(null);
  const [adjustValues, setAdjustValues] = useState<AdjustmentValues>(DEFAULT_ADJUSTMENTS);

  // Render-throttle refs
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ param: AdjustmentParam; value: number } | null>(null);
  const inBatchRef = useRef(false);

  const ensureAdjustEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === "adjustments") {
        adjustEffectIdRef.current = eid;
        return eid;
      }
    }

    ce.beginSilent();
    const eid = ce.block.createEffect("adjustments");
    ce.block.appendEffect(editableBlockId, eid);
    ce.endSilent();
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
      vals[param] = ce.block.getAdjustmentValue(eid, param);
    }
    setAdjustValues(vals);
  }, [engineRef]);

  const flushPending = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const ce = engineRef.current;
    const eid = adjustEffectIdRef.current;
    if (!ce || eid === null) return;
    ce.block.setAdjustmentValue(eid, pending.param, pending.value);
    ce.renderDirty();
  }, [engineRef]);

  const handleAdjustChange = useCallback(
    (param: AdjustmentParam, value: number) => {
      // Update React state immediately for responsive slider UI
      setAdjustValues((prev) => ({ ...prev, [param]: value }));

      const ce = engineRef.current;
      const eid = adjustEffectIdRef.current;
      if (!ce || eid === null) return;

      // Start a batch on first change of this drag (groups into one undo entry)
      if (!inBatchRef.current) {
        ce.beginBatch();
        inBatchRef.current = true;
      }

      // Store the pending write; throttle to rAF (GPU render is fast)
      pendingRef.current = { param, value };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const p = pendingRef.current;
          if (!p) return;
          pendingRef.current = null;
          const engine = engineRef.current;
          const effectId = adjustEffectIdRef.current;
          if (!engine || effectId === null) return;
          engine.block.setAdjustmentValue(effectId, p.param, p.value);
          engine.renderDirty();
        });
      }
    },
    [engineRef],
  );

  const handleAdjustCommit = useCallback(() => {
    // Flush any pending RAF to ensure the final value is written
    flushPending();
    if (inBatchRef.current) {
      engineRef.current?.endBatch();
      inBatchRef.current = false;
    }
  }, [engineRef, flushPending]);

  const handleAdjustReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const effects = ce.block.getEffects(editableBlockId);
    for (let i = effects.length - 1; i >= 0; i--) {
      if (ce.block.getKind(effects[i]) === "adjustments") {
        ce.block.removeEffect(editableBlockId, i);
        break;
      }
    }

    const eid = ce.block.createEffect("adjustments");
    ce.block.appendEffect(editableBlockId, eid);
    adjustEffectIdRef.current = eid;
    setAdjustValues(DEFAULT_ADJUSTMENTS);
  }, [engineRef, editableBlockId]);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Re-sync local state when undo/redo changes the engine state
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce) return;
    return ce.onHistoryChanged(() => {
      const eid = adjustEffectIdRef.current;
      if (eid === null || !ce.block.exists(eid)) {
        // Effect was destroyed by undo â€” re-discover it
        if (editableBlockId !== null) {
          const effects = ce.block.getEffects(editableBlockId);
          const found = effects.find((id) => ce.block.getKind(id) === "adjustments");
          adjustEffectIdRef.current = found ?? null;
        } else {
          adjustEffectIdRef.current = null;
        }
      }
      const eid2 = adjustEffectIdRef.current;
      if (!eid2 || !ce.block.exists(eid2)) {
        setAdjustValues(DEFAULT_ADJUSTMENTS);
      } else {
        const vals = {} as AdjustmentValues;
        for (const param of ADJUSTMENT_PARAMS) {
          vals[param] = ce.block.getAdjustmentValue(eid2, param);
        }
        setAdjustValues(vals);
      }
    });
  }, [engineRef, editableBlockId]);

  return {
    adjustValues,
    ensureAdjustEffect,
    syncAdjustValues,
    handleAdjustChange,
    handleAdjustCommit,
    handleAdjustReset,
  };
}
