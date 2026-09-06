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

export function groupSelection(engine: EditxEngine): number | undefined {
  const ids = engine.block.findAllSelected();
  if (ids.length < 2) return undefined;
  const groupId = engine.block.group(ids);
  if (groupId !== undefined) engine.block.select(groupId);
  return groupId;
}

export function ungroupSelection(engine: EditxEngine, groupId?: number): number[] {
  const selectedGroup =
    groupId ?? engine.block.findAllSelected().find((id) => engine.block.getType(id) === "group");
  if (selectedGroup === undefined || engine.block.getType(selectedGroup) !== "group") return [];
  const children = engine.block.ungroup(selectedGroup);
  engine.block.deselectAll();
  return children;
}

export function enterGroup(engine: EditxEngine, groupId: number): void {
  if (engine.block.getType(groupId) !== "group") return;
  engine.block.enterGroup(groupId);
  engine.block.deselectAll();
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
    groupSelection(ce);
  }, [engineRef]);

  const handleUngroup = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ungroupSelection(ce);
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
