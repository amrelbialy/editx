import { useCallback, useRef, useState } from 'react';
import { EFFECT_FILTER_NAME, type CreativeEngine } from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';

export interface UseFilterToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useFilterTool({ engineRef }: UseFilterToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const filterEffectIdRef = useRef<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');

  const ensureFilterEffect = useCallback((): number | null => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return null;

    const effects = ce.block.getEffects(editableBlockId);
    for (const eid of effects) {
      if (ce.block.getKind(eid) === 'filter') {
        filterEffectIdRef.current = eid;
        return eid;
      }
    }

    const eid = ce.block.createEffect('filter');
    ce.block.appendEffect(editableBlockId, eid);
    filterEffectIdRef.current = eid;
    return eid;
  }, [engineRef, editableBlockId]);

  const syncFilterState = useCallback(() => {
    const ce = engineRef.current;
    const eid = filterEffectIdRef.current;
    if (!ce || eid === null) {
      setActiveFilter('');
      return;
    }
    const name = ce.block.getString(eid, EFFECT_FILTER_NAME);
    setActiveFilter(name);
  }, [engineRef]);

  const handleFilterSelect = useCallback((name: string) => {
    const ce = engineRef.current;
    const eid = filterEffectIdRef.current;
    if (!ce || eid === null) return;

    ce.block.setString(eid, EFFECT_FILTER_NAME, name);
    setActiveFilter(name);
  }, [engineRef]);

  return {
    activeFilter,
    ensureFilterEffect,
    syncFilterState,
    handleFilterSelect,
  };
}
