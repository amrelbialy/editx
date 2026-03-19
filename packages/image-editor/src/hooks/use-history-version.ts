import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';

/**
 * Returns a version counter that increments on every undo/redo.
 * Add this to useEffect dependency arrays so components re-read
 * engine state after history changes.
 */
export function useHistoryVersion(engine: CreativeEngine | null): number {
  const versionRef = useRef(0);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!engine) return () => {};
      const handler = () => {
        versionRef.current++;
        onStoreChange();
      };
      engine.on('history:undo', handler);
      engine.on('history:redo', handler);
      return () => {
        engine.off('history:undo', handler);
        engine.off('history:redo', handler);
      };
    },
    [engine],
  );

  const getSnapshot = useCallback(() => versionRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
