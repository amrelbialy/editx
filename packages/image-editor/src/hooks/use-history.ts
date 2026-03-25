import type { CreativeEngine } from "@creative-editor/engine";
import { useCallback, useEffect, useState } from "react";

export interface UseHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useHistory(
  engine: CreativeEngine | null,
  engineRef: React.RefObject<CreativeEngine | null>,
): UseHistoryResult {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryState = useCallback(() => {
    const ce = engineRef.current;
    setCanUndo(ce?.editor.canUndo() ?? false);
    setCanRedo(ce?.editor.canRedo() ?? false);
  }, [engineRef]);

  const handleUndo = useCallback(() => {
    engineRef.current?.editor.undo();
    syncHistoryState();
  }, [engineRef, syncHistoryState]);

  const handleRedo = useCallback(() => {
    engineRef.current?.editor.redo();
    syncHistoryState();
  }, [engineRef, syncHistoryState]);

  useEffect(() => {
    if (!engine) return;
    syncHistoryState();
    const unsub = engine.event.subscribe([], syncHistoryState);
    engine.on("history:undo", syncHistoryState);
    engine.on("history:redo", syncHistoryState);
    engine.on("history:clear", syncHistoryState);
    return () => {
      unsub();
      engine.off("history:undo", syncHistoryState);
      engine.off("history:redo", syncHistoryState);
      engine.off("history:clear", syncHistoryState);
    };
  }, [engine, syncHistoryState]);

  return { canUndo, canRedo, handleUndo, handleRedo };
}
