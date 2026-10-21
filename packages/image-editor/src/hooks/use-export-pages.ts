import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import type { PageExportTarget } from "../utils/export-pages";

interface ExportPage {
  id: number;
  name: string;
  width: number;
  height: number;
}

export function useExportPages(engine: EditxEngine | null, open: boolean, enabled: boolean) {
  const [pages, setPages] = useState<ExportPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<number | null>(null);
  const [mode, setMode] = useState<PageExportTarget["mode"]>("current");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggle = useCallback((id: number) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  }, []);

  useEffect(() => {
    if (!open || !enabled || !engine) return;
    const refresh = () => {
      const ids = engine.scene.getPages();
      setPages(ids.map((id) => ({ id, ...engine.scene.getPageProperties(id) })));
      setCurrentPageId(engine.scene.getCurrentPage());
      setSelectedIds((previous) => previous.filter((id) => ids.includes(id)));
    };
    const reset = () => {
      setMode("current");
      const current = engine.scene.getCurrentPage();
      setSelectedIds(current === null ? [] : [current]);
      refresh();
    };
    reset();
    engine.on("history:clear", reset);
    const unsubscribe = [
      engine.scene.onPageOrderChanged(refresh),
      engine.scene.onActivePageChanged(refresh),
      engine.onHistoryChanged(refresh),
      engine.event.subscribe([], refresh),
      () => engine.off("history:clear", reset),
    ];
    return () => {
      for (const stop of unsubscribe) stop();
    };
  }, [engine, open, enabled]);

  const target: PageExportTarget | undefined = enabled
    ? mode === "selected"
      ? { mode, ids: selectedIds }
      : { mode }
    : undefined;
  const canExport =
    !enabled ||
    (!!engine &&
      pages.length > 0 &&
      (mode !== "current" || pages.some(({ id }) => id === currentPageId)) &&
      (mode !== "selected" || selectedIds.some((id) => pages.some((page) => page.id === id))));

  return { pages, currentPageId, mode, setMode, selectedIds, toggle, target, canExport };
}
