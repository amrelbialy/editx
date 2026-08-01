import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useRef } from "react";

/**
 * Coalesces a rapid burst of engine mutations into a single undo/redo entry.
 *
 * Continuous controls — native `<input type="color">` pickers and sliders —
 * emit a change event on every pointer move. Without coalescing each event
 * becomes its own history step, so one colour drag can push dozens of entries;
 * undo then appears to "stick" while it walks back through every intermediate
 * value before the shape itself is removed.
 *
 * `commit(mutate)` opens an engine batch on the first call of a burst, applies
 * the change, renders it live via `renderDirty()`, then closes the batch after
 * `idleMs` of inactivity — collapsing the whole burst into one history entry.
 * `flush()` closes the open batch immediately (e.g. on a slider commit event).
 */
export function useCoalescedHistory(engine: EditxEngine | null, idleMs = 350) {
  const openRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    if (openRef.current) {
      openRef.current = false;
      engine?.endBatch();
    }
  }, [engine]);

  const commit = useCallback(
    (mutate: () => void) => {
      if (!engine) return;
      if (!openRef.current) {
        engine.beginBatch();
        openRef.current = true;
      }
      mutate();
      // Batched execs don't flush until endBatch — render now for live preview.
      engine.renderDirty();
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, idleMs);
    },
    [engine, flush, idleMs],
  );

  // Never leave a batch open when the panel unmounts or the engine changes.
  useEffect(() => flush, [flush]);

  return { commit, flush };
}
