import type { CreativeEngine } from "@creative-editor/engine";
import { useCallback } from "react";
import type { EditorEventCallbacks, ImageEditorToolId } from "../config/config.types";
import { type ImageEditorTool, useImageEditorStore } from "../store/image-editor-store";

export interface UseToolManagerOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  crop: {
    enterCropMode: () => void;
    handleCropApply: () => void;
    handleCropCancel: () => void;
  };
  rotateFlip: {
    handleRotateReset: () => void;
    syncRotationState: () => void;
  };
  adjustments: {
    handleAdjustReset: () => void;
    ensureAdjustEffect: () => number | null;
    syncAdjustValues: () => void;
  };
  filter: {
    ensureFilterEffect: () => number | null;
    syncFilterState: () => void;
    handleFilterSelect: (name: string) => void;
  };
  events?: EditorEventCallbacks;
}

export function useToolManager({
  engineRef,
  crop,
  rotateFlip,
  adjustments,
  filter,
  events,
}: UseToolManagerOptions) {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);

  const activeToolId: ImageEditorToolId | null =
    activeTool === "select" ||
    activeTool === "rotate" ||
    activeTool === "resize" ||
    activeTool === "pen"
      ? null
      : (activeTool as ImageEditorToolId);

  const handleToolChange = useCallback(
    (tool: ImageEditorTool) => {
      if (tool === "crop") {
        crop.enterCropMode();
      } else {
        if (activeTool === "crop") {
          const ce = engineRef.current;
          if (ce) {
            ce.editor.setEditMode("Transform");
            ce.editor.fitToScreen();
          }
        }
        setActiveTool(tool);

        if (tool === "rotate") rotateFlip.syncRotationState();
        if (tool === "adjust") {
          adjustments.ensureAdjustEffect();
          adjustments.syncAdjustValues();
        }
        if (tool === "filter") {
          filter.ensureFilterEffect();
          filter.syncFilterState();
        }
      }
      events?.onToolChange?.(tool === "select" ? null : tool);
    },
    [activeTool, engineRef, crop, setActiveTool, rotateFlip, adjustments, filter, events],
  );

  const handleSidebarToolSelect = useCallback(
    (toolId: ImageEditorToolId) => {
      if (activeToolId === toolId) {
        const ce = engineRef.current;
        if (activeTool === "crop" && ce) {
          ce.editor.setEditMode("Transform");
          ce.editor.fitToScreen();
        }
        setActiveTool("select");
        return;
      }
      handleToolChange(toolId as ImageEditorTool);
    },
    [activeToolId, activeTool, engineRef, handleToolChange, setActiveTool],
  );

  const handleDone = useCallback(() => {
    if (activeTool === "crop") {
      crop.handleCropApply();
    } else {
      setActiveTool("select");
    }
  }, [activeTool, crop, setActiveTool]);

  const handleContextualReset = useCallback(() => {
    if (activeTool === "crop") crop.handleCropCancel();
    else if (activeTool === "rotate") rotateFlip.handleRotateReset();
    else if (activeTool === "adjust") adjustments.handleAdjustReset();
    else if (activeTool === "filter") filter.handleFilterSelect("");
  }, [activeTool, crop, rotateFlip, adjustments, filter]);

  return {
    activeTool,
    activeToolId,
    handleToolChange,
    handleSidebarToolSelect,
    handleDone,
    handleContextualReset,
  };
}
