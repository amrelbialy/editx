import { type CreativeEngine, EFFECT_FILTER_NAME } from "@creative-editor/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImageEditorStore } from "../store/image-editor-store";

export interface UseFilterToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useFilterTool({ engineRef }: UseFilterToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const filterEffectIdRef = useRef<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("");

  const ensureFilterEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === "filter") {
        filterEffectIdRef.current = eid;
        return eid;
      }
    }

    ce.core.beginSilent();
    const eid = ce.block.createEffect("filter");
    ce.block.appendEffect(editableBlockId, eid);
    ce.core.endSilent();
    filterEffectIdRef.current = eid;
    return eid;
  }, [engineRef, editableBlockId]);

  const syncFilterState = useCallback(() => {
    const ce = engineRef.current;
    const eid = filterEffectIdRef.current;
    if (!ce || eid === null) {
      setActiveFilter("");
      return;
    }
    const name = ce.block.getString(eid, EFFECT_FILTER_NAME);
    setActiveFilter(name);
  }, [engineRef]);

  const handleFilterSelect = useCallback(
    (name: string) => {
      const ce = engineRef.current;
      const eid = filterEffectIdRef.current;
      if (!ce || eid === null) return;

      ce.block.setString(eid, EFFECT_FILTER_NAME, name);
      setActiveFilter(name);
    },
    [engineRef],
  );

  // Re-sync local state when undo/redo changes the engine state
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const handler = () => {
      const eid = filterEffectIdRef.current;
      if (eid === null || !ce.core.getBlockStore().exists(eid)) {
        // Effect was destroyed by undo — re-discover it
        if (editableBlockId !== null) {
          const effects = ce.block.getEffects(editableBlockId);
          const found = effects.find((id) => ce.block.getKind(id) === "filter");
          filterEffectIdRef.current = found ?? null;
        } else {
          filterEffectIdRef.current = null;
        }
      }
      const eid2 = filterEffectIdRef.current;
      if (!eid2 || !ce.core.getBlockStore().exists(eid2)) {
        setActiveFilter("");
      } else {
        setActiveFilter(ce.block.getString(eid2, EFFECT_FILTER_NAME));
      }
    };
    ce.on("history:undo", handler);
    ce.on("history:redo", handler);
    return () => {
      ce.off("history:undo", handler);
      ce.off("history:redo", handler);
    };
  }, [engineRef, editableBlockId]);

  return {
    activeFilter,
    ensureFilterEffect,
    syncFilterState,
    handleFilterSelect,
  };
}
