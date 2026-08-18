import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";

interface ImageFillSnapshot {
  engine: EditxEngine | null;
  blockId: number | null;
  blockType: string | null;
  value: boolean;
}

function readImageFill(
  engine: EditxEngine | null,
  blockId: number | null,
  blockType: string | null,
): boolean {
  return (
    engine !== null &&
    blockId !== null &&
    blockType === "graphic" &&
    engine.block.getFillImage(blockId) !== null
  );
}

export function useBlockImageFill(
  engine: EditxEngine | null,
  blockId: number | null,
  blockType: string | null,
): boolean {
  const [snapshot, setSnapshot] = useState<ImageFillSnapshot>(() => ({
    engine,
    blockId,
    blockType,
    value: readImageFill(engine, blockId, blockType),
  }));

  const refresh = useCallback(() => {
    setSnapshot({
      engine,
      blockId,
      blockType,
      value: readImageFill(engine, blockId, blockType),
    });
  }, [engine, blockId, blockType]);

  useEffect(() => {
    refresh();
    if (!engine || blockId === null || blockType !== "graphic") return;
    const unsubscribeState = engine.block.onStateChanged([blockId], refresh);
    const unsubscribeHistory = engine.onHistoryChanged(refresh);
    return () => {
      unsubscribeState();
      unsubscribeHistory();
    };
  }, [engine, blockId, blockType, refresh]);

  const matchesCurrentBlock =
    snapshot.engine === engine && snapshot.blockId === blockId && snapshot.blockType === blockType;
  return matchesCurrentBlock ? snapshot.value : readImageFill(engine, blockId, blockType);
}
