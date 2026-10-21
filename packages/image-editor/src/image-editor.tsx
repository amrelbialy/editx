import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExportDialog } from "./components/panels/export-dialog";
import { announce } from "./components/shell/announcer";
import { DiscardConfirmationDialog } from "./components/shell/discard-confirmation-dialog";
import { EditorShell } from "./components/shell/editor-shell";
import { EditorWorkspace } from "./components/shell/editor-workspace";
import { ErrorPlaceholder } from "./components/shell/error-placeholder";
import { LoadingOverlay } from "./components/shell/loading-overlay";
import { getToolPanelTitle } from "./components/shell/panel-titles";
import { Providers } from "./components/shell/providers";
import type { CloseReason, ImageEditorConfig } from "./config/config.types";
import { defaultConfig } from "./config/default-config";
import { useEngine } from "./hooks/use-engine";
import { useExport } from "./hooks/use-export";
import { useGroupActions } from "./hooks/use-group-actions";
import { useHistory } from "./hooks/use-history";
import { useShortcuts } from "./hooks/use-shortcuts";
import { useTools } from "./hooks/use-tools";
import { useZoom } from "./hooks/use-zoom";
import type { ImageEditorProps } from "./image-editor.types";
import { useImageEditorStore } from "./store/image-editor-store";
import { deepMerge } from "./utils/deep-merge";
import { extractFilename } from "./utils/extract-filename";

export type { EditorHandle, ImageEditorProps, ImageSource } from "./image-editor.types";

export const ImageEditor: React.FC<ImageEditorProps> = (props) => {
  const {
    src,
    onSave,
    onClose,
    onReady,
    width = "100%",
    height = "100vh",
    validation,
    keepZoomOnSourceChange = false,
    config: userConfig,
    slots,
    events,
  } = props;

  // --- Refs & custom hooks ---
  const onReadyFiredRef = useRef(false);
  const defaultToolAppliedRef = useRef(false);

  const engineState = useEngine({ src, validation, keepZoomOnSourceChange });
  const { containerRef, engine, engineRef, handleRetry, selectedShapeId, setSelectedShapeId } =
    engineState;

  // Tool hooks run outside <Providers>, so `useConfig()` would return the
  // context default. Merge the user config the same way the provider does and
  // pass it down explicitly so tool creation honours user config.
  const mergedConfig = useMemo<ImageEditorConfig>(
    () =>
      deepMerge(
        defaultConfig as unknown as Record<string, unknown>,
        (userConfig ?? {}) as unknown as Record<string, unknown>,
      ) as unknown as ImageEditorConfig,
    [userConfig],
  );

  const tools = useTools({
    engineRef,
    engine,
    selectedShapeId,
    setSelectedShapeId,
    events,
    config: mergedConfig,
  });
  const zoom = useZoom({ engineRef, engine });
  const { handleExport, isExporting } = useExport({
    engineRef,
    exportConfig: userConfig?.export,
    onSave,
    onClose,
    events,
    notify: tools.notify,
    defaultFilename: extractFilename(src),
  });

  // --- Store selectors (grouped) ---
  const isLoading = useImageEditorStore((s) => s.isLoading);
  const error = useImageEditorStore((s) => s.error);
  const markDirty = useImageEditorStore((s) => s.markDirty);
  const hasUnsavedChanges = useImageEditorStore((s) => s.hasUnsavedChanges);

  // --- useState ---
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingCloseReason, setPendingCloseReason] = useState<CloseReason>("close-button");

  // --- useCallback ---
  const openExportDialog = useCallback(() => setExportDialogOpen(true), []);

  const unsavedChangesWarning = userConfig?.ui?.unsavedChangesWarning ?? true;

  const requestClose = useCallback(
    (reason: CloseReason) => {
      if (!onClose) return;
      if (hasUnsavedChanges && unsavedChangesWarning) {
        setPendingCloseReason(reason);
        setDiscardDialogOpen(true);
      } else {
        onClose(reason, false);
      }
    },
    [onClose, hasUnsavedChanges, unsavedChangesWarning],
  );

  const handleDiscardConfirm = useCallback(() => {
    setDiscardDialogOpen(false);
    onClose?.(pendingCloseReason, true);
  }, [onClose, pendingCloseReason]);

  const handleDiscardCancel = useCallback(() => {
    setDiscardDialogOpen(false);
  }, []);

  const handleCloseButton = useCallback(() => requestClose("close-button"), [requestClose]);

  const history = useHistory(engine, engineRef);

  const { handleGroup, handleUngroup, exitGroupIfActive } = useGroupActions(engineRef);

  const handleEscape = useCallback(() => {
    // Group context takes priority (text-editor Escape is handled separately by
    // the overlay while contentEditable is focused, so it runs before this).
    if (exitGroupIfActive()) return;
    if (tools.activeTool !== "select") {
      if (tools.activeTool === "crop") {
        tools.crop.handleCropCancel();
      } else {
        tools.setActiveTool("select");
      }
    }
  }, [tools, exitGroupIfActive]);

  // --- useEffect ---
  useShortcuts({
    enabled: !isLoading && !error,
    onToolSelect: tools.handleSidebarToolSelect,
    onUndo: history.handleUndo,
    onRedo: history.handleRedo,
    onZoomIn: zoom.handleZoomIn,
    onZoomOut: zoom.handleZoomOut,
    onZoomFit: zoom.handleAutoFitPage,
    onZoom100: zoom.handleZoom100,
    onDuplicate: tools.duplicate,
    onBringForward: tools.blockActions.bringForward,
    onSendBackward: tools.blockActions.sendBackward,
    onBringToFront: tools.blockActions.bringToFront,
    onSendToBack: tools.blockActions.sendToBack,
    onEscape: handleEscape,
    onDelete: tools.deleteBlock,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
  });

  useEffect(() => {
    if (tools.activeTool !== "select") {
      const title = getToolPanelTitle(tools.activeTool, userConfig?.customTools);
      if (title) announce(`${title} tool selected`);
    }
  }, [tools.activeTool, userConfig?.customTools]);

  // Track unsaved changes via engine block events
  // biome-ignore lint/correctness/useExhaustiveDependencies: engine triggers re-subscribe when instance is created
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce) return;
    return ce.event.subscribe([], () => markDirty());
  }, [engine, engineRef, markDirty]);

  // Surface the imperative editor handle once the engine is ready.
  useEffect(() => {
    const ce = engineRef.current;
    if (!ce || !engine || !onReady || onReadyFiredRef.current) return;
    onReadyFiredRef.current = true;
    onReady({
      engine: ce,
      saveScene: () => ce.scene.saveToString(),
      loadScene: (json: string) => ce.scene.loadFromString(json),
    });
  }, [engine, engineRef, onReady]);

  // Open the editor on the configured default tool (once, after load).
  useEffect(() => {
    if (defaultToolAppliedRef.current) return;
    if (isLoading || error || !engine) return;
    const defaultTool = userConfig?.defaultTool;
    if (!defaultTool) return;
    defaultToolAppliedRef.current = true;
    tools.handleSidebarToolSelect(defaultTool);
  }, [isLoading, error, engine, userConfig?.defaultTool, tools.handleSidebarToolSelect]);

  // Sync theme accent color to engine transformer
  // biome-ignore lint/correctness/useExhaustiveDependencies: userConfig triggers re-read of computed theme vars
  useEffect(() => {
    if (!engine || !containerRef.current) return;
    const el = containerRef.current.closest(".ie-theme") as HTMLElement | null;
    if (!el) return;
    const primary = getComputedStyle(el).getPropertyValue("--primary").trim();
    if (primary && engine.setAccentColor) engine.setAccentColor(primary);
  }, [engine, containerRef, userConfig]);

  return (
    <Providers config={userConfig}>
      <EditorShell style={{ width, height }} className="relative">
        <EditorWorkspace
          engineState={engineState}
          tools={tools}
          zoom={zoom}
          history={history}
          config={userConfig}
          slots={slots}
          onExport={openExportDialog}
          isExporting={isExporting}
          onClose={onClose ? handleCloseButton : undefined}
        />

        <ExportDialog
          engine={engine}
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <DiscardConfirmationDialog
          open={discardDialogOpen}
          onDiscard={handleDiscardConfirm}
          onCancel={handleDiscardCancel}
        />

        {isLoading && !error && <LoadingOverlay />}
        {error && <ErrorPlaceholder error={error} onRetry={handleRetry} />}
      </EditorShell>
    </Providers>
  );
};
