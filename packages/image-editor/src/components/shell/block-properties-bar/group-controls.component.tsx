import type { EditxEngine } from "@editx/engine";
import { Group, Ungroup } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
    if (selectedIds.length > 1) engine.block.group(selectedIds);
  }, [engine, selectedIds]);

  const handleUngroup = useCallback(() => {
    if (engine.block.getType(blockId) === "group") engine.block.ungroup(blockId);
  }, [engine, blockId]);

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
        <IconButton
          onClick={handleUngroup}
          label={t("action.ungroup")}
          icon={<Ungroup className="h-4 w-4" />}
        />
      )}
    </>
  );
};
