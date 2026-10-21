import {
  type EditxEngine,
  hexToColor,
  type PageProperties,
  type PagePropertiesUpdate,
} from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n/i18n-context";
import { useNotifications } from "./use-notifications";

export function usePageManagement(engine: EditxEngine, disabled: boolean) {
  const { t } = useTranslation();
  const notify = useNotifications();

  const [draft, setDraft] = useState<{ id: number; properties: PageProperties } | null>(null);

  const run = useCallback(
    (action: () => void): boolean => {
      try {
        if (disabled) throw new Error(t("pages.finishEditing"));
        action();
        return true;
      } catch (cause) {
        notify.error(
          `${t("pages.manageError")}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
        return false;
      }
    },
    [disabled, notify, t],
  );
  const reveal = useCallback(
    (pageId: number) => {
      while (engine.block.getGroupContext().length > 0) engine.block.exitGroup();
      engine.block.select(pageId);
      engine.editor.fitToScreen(24);
    },
    [engine],
  );
  const add = useCallback(() => run(() => reveal(engine.scene.addPage())), [engine, reveal, run]);
  const duplicate = useCallback(
    (id: number) => run(() => reveal(engine.scene.duplicatePage(id))),
    [engine, reveal, run],
  );
  const remove = useCallback(
    (id: number) =>
      run(() => {
        if (engine.scene.getPages().length === 1) throw new Error(t("pages.lastPage"));
        const active = engine.scene.getCurrentPage() === id;
        engine.scene.removePage(id);
        const next = engine.scene.getCurrentPage();
        if (active && next !== null) reveal(next);
      }),
    [engine, reveal, run, t],
  );
  const move = useCallback(
    (id: number, offset: number) =>
      run(() => {
        engine.scene.getPageProperties(id);
        engine.scene.movePage(id, engine.scene.getPages().indexOf(id) + offset);
      }),
    [engine, run],
  );
  const edit = useCallback(
    (id: number) => run(() => setDraft({ id, properties: engine.scene.getPageProperties(id) })),
    [engine, run],
  );
  const save = useCallback(
    (id: number, update: PagePropertiesUpdate) =>
      run(() => {
        engine.scene.setPageProperties(id, update);
        setDraft(null);
      }),
    [engine, run],
  );
  const setBackground = useCallback(
    (id: number, color: string) =>
      run(() => {
        const current = engine.scene.getPageProperties(id).backgroundColor;
        engine.scene.setPageProperties(id, {
          backgroundColor: { ...hexToColor(color), a: current.a },
        });
      }),
    [engine, run],
  );

  useEffect(() => {
    const reset = () => setDraft(null);
    engine.on("history:clear", reset);
    const stop = engine.scene.onPageOrderChanged(() => {
      setDraft((current) =>
        current && !engine.scene.getPages().includes(current.id) ? null : current,
      );
    });
    return () => {
      engine.off("history:clear", reset);
      stop();
    };
  }, [engine]);

  return {
    draft,
    add,
    duplicate,
    remove,
    move,
    edit,
    save,
    setBackground,
    close: () => setDraft(null),
  };
}
