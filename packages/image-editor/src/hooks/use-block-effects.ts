import { type AdjustmentParam, type EditxEngine, EFFECT_FILTER_NAME } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdjustmentValues } from "../components/panels/adjust-panel";
import { DEFAULT_ADJUSTMENTS, syncFromEngine } from "./block-effects-sync";

export interface UseBlockEffectsOptions {
  engineRef: React.RefObject<EditxEngine | null>;
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
  const [activeFilter, setActiveFilter] = useState("");

  // Render-throttle refs
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ param: AdjustmentParam; value: number } | null>(null);
  const inBatchRef = useRef(false);

  // Sync state when blockId changes
  useEffect(() => {
    // If an adjustment batch from the previous block is still open, commit it
    // before repointing the effect refs. Otherwise the `!inBatchRef.current`
    // guard in handleAdjustChange would skip re-opening and the old block's
    // batch would leak forever — the same defect class as the unmount leak,
    // just triggered by a blockId change mid-drag. (commitRef is assigned
    // below; effects run after render so it is always populated here.)
    if (inBatchRef.current) {
      commitRef.current();
    }

    const ce = engineRef.current;
    if (!ce || blockId === null) {
      adjustEffectIdRef.current = null;
      filterEffectIdRef.current = null;
      setAdjustValues(DEFAULT_ADJUSTMENTS);
      setActiveFilter("");
      return;
    }

    syncFromEngine(
      ce,
      blockId,
      { adjust: adjustEffectIdRef, filter: filterEffectIdRef },
      { setAdjustValues, setActiveFilter },
    );
  }, [engineRef, blockId]);

  // --- Adjustments ---

  const ensureAdjustEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return null;
    if (adjustEffectIdRef.current !== null) return adjustEffectIdRef.current;

    const eid = ce.block.createEffect("adjustments");
    ce.block.appendEffect(blockId, eid);
    adjustEffectIdRef.current = eid;
    return eid;
  }, [engineRef, blockId]);

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
      let eid = adjustEffectIdRef.current;
      if (!ce) return;
      if (eid === null) {
        eid = ensureAdjustEffect();
        if (eid === null) return;
      }

      // Start a batch on first change of this drag
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
    [engineRef, ensureAdjustEffect],
  );

  const handleAdjustCommit = useCallback(() => {
    flushPending();
    if (inBatchRef.current) {
      engineRef.current?.endBatch();
      inBatchRef.current = false;
    }
  }, [engineRef, flushPending]);

  // Keep the latest commit in a ref so the unmount effect can call it without
  // re-subscribing. `handleAdjustCommit` already cancels the pending rAF via
  // `flushPending`, so this both flushes and closes any open batch.
  const commitRef = useRef(handleAdjustCommit);
  commitRef.current = handleAdjustCommit;

  const handleAdjustReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return;

    const effects = ce.block.getEffects(blockId);
    for (let i = effects.length - 1; i >= 0; i--) {
      if (ce.block.getKind(effects[i]) === "adjustments") {
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

    const eid = ce.block.createEffect("filter");
    ce.block.appendEffect(blockId, eid);
    filterEffectIdRef.current = eid;
    return eid;
  }, [engineRef, blockId]);

  const handleFilterSelect = useCallback(
    (name: string) => {
      const ce = engineRef.current;
      let eid = filterEffectIdRef.current;
      if (!ce) return;
      if (eid === null) {
        eid = ensureFilterEffect();
        if (eid === null) return;
      }
      ce.block.setString(eid, EFFECT_FILTER_NAME, name);
      setActiveFilter(name);
    },
    [engineRef, ensureFilterEffect],
  );

  // Never leave an adjustment batch open when the hook unmounts.
  useEffect(() => () => commitRef.current(), []);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce || blockId === null) return;
    return ce.onHistoryChanged(() => {
      syncFromEngine(
        ce,
        blockId,
        { adjust: adjustEffectIdRef, filter: filterEffectIdRef },
        { setAdjustValues, setActiveFilter },
      );
    });
  }, [engineRef, blockId]);

  return {
    adjustValues,
    activeFilter,
    handleAdjustChange,
    handleAdjustCommit,
    handleAdjustReset,
    handleFilterSelect,
  };
}
