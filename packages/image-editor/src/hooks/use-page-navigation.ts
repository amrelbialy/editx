import { type EditxEngine, PageViewError } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import type { PageNavigationLayout } from "../config/ui-config.types";
import { useTranslation } from "../i18n/i18n-context";
import { useImageEditorStore } from "../store/image-editor-store";
import {
  synchronizeDimensions,
  synchronizePageImage,
  synchronizePageTools,
} from "../utils/page-editor-state";
import { useNotifications } from "./use-notifications";

function readPages(engine: EditxEngine) {
  const pages = engine.scene.getPages().map((id) => ({
    id,
    ...engine.scene.getPageProperties(id),
  }));
  const selected = engine.block.findAllSelected();
  return {
    pages,
    activePageId: engine.scene.getCurrentPage(),
    selectedPageId: pages.find(({ id }) => selected.includes(id))?.id ?? null,
  };
}

export function usePageNavigation(engine: EditxEngine, layout: PageNavigationLayout = "vertical") {
  const { t } = useTranslation();
  const notify = useNotifications();
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const [snapshot, setSnapshot] = useState(() => readPages(engine));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(() => engine.editor.getEditMode() === "Crop");

  const navigate = useCallback(
    (pageId: number, fit = false) => {
      try {
        engine.scene.setActivePage(pageId);
        while (engine.block.getGroupContext().length > 0) engine.block.exitGroup();
        engine.block.select(pageId);
        if (fit) engine.editor.fitToScreen(24);
      } catch (cause) {
        notify.error(
          `${t("pages.switchError")}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    },
    [engine, notify, t],
  );

  useEffect(() => {
    const previousMode = engine.editor.getPageViewMode();
    setReady(false);
    setError(null);
    try {
      engine.editor.setPageViewMode(
        layout === "horizontal" ? "horizontal-pages" : "vertical-pages",
      );
      engine.editor.fitToScreen(24);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return;
    }
    setReady(true);
    const refresh = () => {
      synchronizeDimensions(engine);
      setSnapshot(readPages(engine));
    };
    const activate = () => {
      synchronizePageTools(engine);
      refresh();
    };
    const reset = () => {
      const store = useImageEditorStore.getState();
      const staleText =
        store.editingTextBlockId !== null &&
        engine.block.getTextEditingSession(store.editingTextBlockId) === null;
      const staleCrop = store.activeTool === "crop" && engine.editor.getEditMode() !== "Crop";
      if (staleText || staleCrop) synchronizePageTools(engine);
      else synchronizePageImage(engine);
      refresh();
    };
    const select = () => {
      const next = readPages(engine);
      const store = useImageEditorStore.getState();
      if (next.selectedPageId !== null && store.editingTextBlockId !== null) {
        engine.block.endTextEditing(store.editingTextBlockId);
        store.setEditingTextBlockId(null);
        store.setTextSelectionRange(null);
      }
      setSnapshot(next);
    };
    engine.on("history:clear", reset);
    synchronizePageTools(engine);
    setSnapshot(readPages(engine));
    setCropping(engine.editor.getEditMode() === "Crop");
    const unsubscribe = [
      engine.scene.onActivePageChanged(activate),
      engine.scene.onPageOrderChanged(refresh),
      engine.block.onSelectionChanged(select),
      engine.event.subscribe([], refresh),
      engine.onHistoryChanged(refresh),
      engine.onZoomChanged(() => synchronizeDimensions(engine)),
      engine.onEditModeChanged(({ mode }) => setCropping(mode === "Crop")),
      () => engine.off("history:clear", reset),
    ];
    return () => {
      for (const stop of unsubscribe) stop();
      try {
        engine.editor.setPageViewMode(previousMode);
      } catch (cause) {
        if (!(cause instanceof PageViewError) || cause.code !== "ENGINE_DISPOSED") throw cause;
      }
    };
  }, [engine, layout]);

  const editing = cropping || activeTool === "crop" || editingTextBlockId !== null;
  return {
    ...snapshot,
    error,
    editing,
    disabled: !ready || editing,
    navigate,
  };
}
