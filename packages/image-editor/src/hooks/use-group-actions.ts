import type { EditxEngine } from "@editx/engine";
import type { RefObject } from "react";
import { useCallback } from "react";

export interface GroupActions {
  /** Group the current multi-selection (no-op unless 2+ blocks selected). */
  handleGroup: () => void;
  /** Ungroup the selected group (no-op unless a group is selected). */
  handleUngroup: () => void;
  /** Exit the active group context if any; returns true when it did. */
  exitGroupIfActive: () => boolean;
}

/**
 * Group / ungroup / exit-group command wiring, extracted from the editor root so
 * the keyboard-shortcut and Escape handling stay thin. All mutations flow
 * through the (undoable) engine `block` group API.
 */
export function useGroupActions(engineRef: RefObject<EditxEngine | null>): GroupActions {
  const handleGroup = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const ids = ce.block.findAllSelected();
    if (ids.length > 1) ce.block.group(ids);
  }, [engineRef]);

  const handleUngroup = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const groupId = ce.block.findAllSelected().find((id) => ce.block.getType(id) === "group");
    if (groupId != null) ce.block.ungroup(groupId);
  }, [engineRef]);

  const exitGroupIfActive = useCallback(() => {
    const ce = engineRef.current;
    if (ce && ce.block.getGroupContext().length > 0) {
      ce.block.exitGroup();
      return true;
    }
    return false;
  }, [engineRef]);

  return { handleGroup, handleUngroup, exitGroupIfActive };
}
