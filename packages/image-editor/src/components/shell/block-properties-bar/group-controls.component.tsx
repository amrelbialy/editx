import type { EditxEngine } from "@editx/engine";
import { FolderOpen, Group, Ungroup } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { enterGroup, groupSelection, ungroupSelection } from "../../../hooks/use-group-actions";
import { useTranslation } from "../../../i18n/i18n-context";
import { IconButton } from "../../ui";

export interface GroupControlsProps {
  engine: EditxEngine;
  blockId: number;
}

/** Group / Ungroup buttons. Group activates on multi-selection; Ungroup when
 *  the selected block is a group. Subscribes to selection + group-context. */
export const GroupControls: React.FC<GroupControlsProps> = (props) => {
  const { engine, blockId } = props;

  const { t } = useTranslation();

  const [selectedIds, setSelectedIds] = useState<number[]>(() => engine.block.findAllSelected());

  useEffect(() => {
    setSelectedIds(engine.block.findAllSelected());
    const off = engine.block.onSelectionChanged((ids: number[]) => setSelectedIds(ids));
    return off;
  }, [engine]);

  const isGroup = engine.block.getType(blockId) === "group";
  const canGroup = selectedIds.length > 1;

  const handleGroup = useCallback(() => {
    groupSelection(engine);
  }, [engine]);

  const handleUngroup = useCallback(() => {
    ungroupSelection(engine, blockId);
  }, [engine, blockId]);

  const handleEnterGroup = useCallback(() => enterGroup(engine, blockId), [engine, blockId]);

  if (!canGroup && !isGroup) return null;

  return (
    <>
      {canGroup && (
        <IconButton
          onClick={handleGroup}
          label={t("action.group")}
          icon={<Group className="h-4 w-4" />}
        />
      )}
      {isGroup && (
        <>
          <IconButton
            onClick={handleEnterGroup}
            label={t("action.enterGroup")}
            icon={<FolderOpen className="h-4 w-4" />}
          />
          <IconButton
            onClick={handleUngroup}
            label={t("action.ungroup")}
            icon={<Ungroup className="h-4 w-4" />}
          />
        </>
      )}
    </>
  );
};
