import type { EditxEngine, PageProperties } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PlaygroundSnapshot {
  sceneId: number | null;
  activePageId: number | null;
  topPageId: number | null;
  pages: (PageProperties & { id: number })[];
  selection: number[];
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
}

export interface PlaygroundEvent {
  id: number;
  type: string;
  details: string;
}

export type RunPlaygroundAction = (label: string, action: () => unknown) => Promise<void>;

export function readPlaygroundSnapshot(engine: EditxEngine): PlaygroundSnapshot {
  const ids = engine.scene.getPages();
  return {
    sceneId: engine.scene.getScene(),
    activePageId: engine.scene.getCurrentPage(),
    topPageId: ids[ids.length - 1] ?? null,
    pages: ids.map((id) => ({ id, ...engine.scene.getPageProperties(id) })),
    selection: engine.block.findAllSelected(),
    canUndo: engine.canUndo(),
    canRedo: engine.canRedo(),
    zoom: engine.editor.getZoom(),
  };
}

export function usePageObservations() {
  const sequence = useRef(0);

  const [engine, setEngine] = useState<EditxEngine | null>(null);
  const [snapshot, setSnapshot] = useState<PlaygroundSnapshot | null>(null);
  const [events, setEvents] = useState<PlaygroundEvent[]>([]);

  const record = useCallback((type: string, details: unknown) => {
    const entry = { id: ++sequence.current, type, details: JSON.stringify(details) };
    setEvents((previous) => [entry, ...previous].slice(0, 12));
  }, []);
  const refresh = useCallback(() => {
    setSnapshot(engine ? readPlaygroundSnapshot(engine) : null);
  }, [engine]);

  useEffect(() => {
    setEvents([]);
    refresh();
    if (!engine) return;
    record("ready", { pageIds: engine.scene.getPages() });
    const observe = (type: string, details: unknown) => {
      record(type, details);
      refresh();
    };
    const unsubscribe = [
      engine.onActivePageChanged((event) => observe("active-page", event)),
      engine.onPageOrderChanged((event) => observe("page-order", event)),
      engine.onHistoryChanged(() =>
        observe("history", { canUndo: engine.canUndo(), canRedo: engine.canRedo() }),
      ),
      engine.event.subscribe([], (batch) => observe("blocks", batch)),
      engine.block.onSelectionChanged(() => observe("selection", engine.block.findAllSelected())),
      engine.onZoomChanged((zoom) => observe("zoom", zoom)),
    ];
    return () => {
      for (const stop of unsubscribe) stop();
    };
  }, [engine, record, refresh]);

  return { engine, setEngine, snapshot, events, record, refresh };
}
