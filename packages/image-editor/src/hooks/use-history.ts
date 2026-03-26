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
    return engine.onHistoryChanged(syncHistoryState);
  }, [engine, syncHistoryState]);

  return { canUndo, canRedo, handleUndo, handleRedo };
}
