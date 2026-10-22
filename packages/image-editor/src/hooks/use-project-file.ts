import { useCallback, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n-context";
import { useImageEditorStore } from "../store/image-editor-store";
import { downloadBlob } from "../utils/download-blob";
import { watchExportDocument } from "../utils/export-document-guard";
import {
  loadPreparedProject,
  type PreparedProjectFile,
  type ProjectEngineRef,
  prepareProjectFile,
  saveProject,
} from "../utils/project-file";
import { useNotifications } from "./use-notifications";

interface ProjectFileOptions {
  engineRef: ProjectEngineRef;
  filename?: string;
  onBusyChange?: (busy: boolean) => void;
}

export function useProjectFile(options: ProjectFileOptions) {
  const { engineRef, filename = "project", onBusyChange } = options;
  const busyRef = useRef(false);

  const { t } = useTranslation();
  const notify = useNotifications();

  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PreparedProjectFile | null>(null);

  const run = useCallback(
    async (operation: () => Promise<void>) => {
      if (busyRef.current) {
        notify.error(t("project.busy"));
        return;
      }
      busyRef.current = true;
      setBusy(true);
      onBusyChange?.(true);
      try {
        await operation();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : t("project.failed"));
      } finally {
        busyRef.current = false;
        setBusy(false);
        onBusyChange?.(false);
      }
    },
    [notify, onBusyChange, t],
  );
  const finishOpen = useCallback(
    async (file: PreparedProjectFile) => {
      const { unchanged } = await loadPreparedProject(engineRef, file);
      const store = useImageEditorStore.getState();
      if (unchanged) store.markClean();
      else store.markDirty();
      notify.success(t("project.opened"));
      notify.info(t("project.portability"));
      if (!unchanged) notify.info(t("project.changed"));
    },
    [engineRef, notify, t],
  );
  const open = useCallback(
    (source: Blob | Uint8Array) =>
      run(async () => {
        const file = await prepareProjectFile(engineRef, source);
        if (useImageEditorStore.getState().hasUnsavedChanges) setPending(file);
        else await finishOpen(file);
      }),
    [engineRef, finishOpen, run],
  );
  const save = useCallback(
    () =>
      run(async () => {
        const engine = engineRef.current;
        if (!engine) throw new Error("The editor is not ready for project files.");
        const guard = watchExportDocument(engine);
        try {
          const blob = await saveProject(engineRef);
          if (engineRef.current !== engine)
            throw new Error("The editor changed. Please try again.");
          guard.assertCurrent();
          downloadBlob(blob, filename.replace(/\.editx$/i, ""));
          if (engineRef.current === engine && !guard.changed) {
            useImageEditorStore.getState().markClean();
          }
          notify.success(t("project.saved"));
          notify.info(t("project.portability"));
        } finally {
          guard.dispose();
        }
      }),
    [engineRef, filename, notify, run, t],
  );
  const confirmOpen = useCallback(() => {
    if (!pending) return;
    setPending(null);
    void run(() => finishOpen(pending));
  }, [finishOpen, pending, run]);
  const cancelOpen = useCallback(() => setPending(null), []);

  return { busy, pending, open, save, confirmOpen, cancelOpen };
}
