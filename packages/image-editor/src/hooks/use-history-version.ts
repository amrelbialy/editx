import type { EditxEngine } from "@editx/engine";
import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Returns a version counter that increments on every undo/redo.
 * Add this to useEffect dependency arrays so components re-read
 * engine state after history changes.
 */
export function useHistoryVersion(engine: EditxEngine | null): number {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!engine) return () => {};
      const handler = () => {
        versionRef.current++;
        onStoreChange();
      };
      return engine.onHistoryChanged(handler);
    },
    [engine],
  );

  const getSnapshot = useCallback(() => versionRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
