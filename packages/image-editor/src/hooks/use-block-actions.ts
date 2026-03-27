import type { EditxEngine } from "@editx/engine";
import { useCallback } from "react";

export type AlignDirection = "left" | "center" | "right" | "top" | "middle" | "bottom";

export interface UseBlockActionsOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  selectedBlockId: number | null;
  onDeselect?: () => void;
}

export function useBlockActions({
  engineRef,
  selectedBlockId,
  onDeselect,
}: UseBlockActionsOptions) {
  const bringForward = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    ce.block.bringForward(selectedBlockId);
  }, [engineRef, selectedBlockId]);

  const sendBackward = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    ce.block.sendBackward(selectedBlockId);
  }, [engineRef, selectedBlockId]);

  const bringToFront = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    ce.block.bringToFront(selectedBlockId);
  }, [engineRef, selectedBlockId]);

  const sendToBack = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    ce.block.sendToBack(selectedBlockId);
  }, [engineRef, selectedBlockId]);

  const duplicate = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    const newId = ce.block.duplicate(selectedBlockId);
    if (newId !== null) {
      ce.block.select(newId);
    }
  }, [engineRef, selectedBlockId]);

  const deleteBlock = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || selectedBlockId === null) return;
    ce.block.destroy(selectedBlockId);
    onDeselect?.();
  }, [engineRef, selectedBlockId, onDeselect]);

  const alignToPage = useCallback(
    (direction: AlignDirection) => {
      const ce = engineRef.current;
      if (!ce || selectedBlockId === null) return;
      ce.block.alignToPage(selectedBlockId, direction);
    },
    [engineRef, selectedBlockId],
  );

  return {
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    duplicate,
    deleteBlock,
    alignToPage,
  };
}

export type UseBlockActionsReturn = ReturnType<typeof useBlockActions>;
