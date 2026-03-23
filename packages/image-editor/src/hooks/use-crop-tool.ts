import { type CreativeEngine, toPrecisedFloat } from "@creative-editor/engine";
import { useCallback, useEffect, useState } from "react";
import { type CropPresetId, useImageEditorStore } from "../store/image-editor-store";

export interface UseCropToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useCropTool({ engineRef }: UseCropToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);
  const activeTool = useImageEditorStore((s) => s.activeTool);

  /** Current crop overlay dimensions (synced from overlay on every change). */
  const [cropDimensions, setCropDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );

  const resolveRatio = useCallback((presetId: CropPresetId): number | null => {
    const originalImage = useImageEditorStore.getState().originalImage;
    switch (presetId) {
      case "free":
        return null;
      case "original":
        return originalImage ? toPrecisedFloat(originalImage.width / originalImage.height) : null;
      case "1:1":
        return 1;
      case "4:3":
        return toPrecisedFloat(4 / 3);
      case "3:4":
        return toPrecisedFloat(3 / 4);
      case "16:9":
        return toPrecisedFloat(16 / 9);
      case "9:16":
        return toPrecisedFloat(9 / 16);
      default:
        return null;
    }
  }, []);

  const enterCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.editor.setEditMode("Crop", { blockId: editableBlockId });
    setCropPreset("free");
    setActiveTool("crop");
    // Read initial crop dimensions
    const dims = ce.block.getCropVisualDimensions(editableBlockId);
    if (dims) setCropDimensions(dims);
  }, [engineRef, editableBlockId, setCropPreset, setActiveTool]);

  const exitCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode("Transform");
    ce.editor.fitToScreen();
    setActiveTool("select");
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  const handleCropPresetChange = useCallback(
    (presetId: CropPresetId) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;
      const ratio = resolveRatio(presetId);
      ce.block.applyCropRatio(editableBlockId, ratio);
      // Sync dimensions after ratio change
      const dims = ce.block.getCropVisualDimensions(editableBlockId);
      if (dims) setCropDimensions(dims);
    },
    [engineRef, resolveRatio, editableBlockId],
  );

  const handleCropApply = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode("Transform");
    ce.editor.fitToScreen();
    setActiveTool("select");
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  const handleCropCancel = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode("Transform");
    ce.editor.undo();
    ce.editor.fitToScreen();
    setActiveTool("select");
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  // ── Resize-tab handlers ──

  /** Set the crop overlay to exact pixel dimensions. */
  const handleResizeDimensions = useCallback(
    (width: number, height: number) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;
      ce.block.applyCropDimensions(editableBlockId, width, height);
      // Read back the actual clamped dimensions
      const dims = ce.block.getCropVisualDimensions(editableBlockId);
      if (dims) setCropDimensions(dims);
    },
    [engineRef, editableBlockId],
  );

  // Poll crop overlay dimensions while in crop mode so inputs stay in sync
  // with manual overlay dragging.
  useEffect(() => {
    if (activeTool !== "crop") return;
    const interval = setInterval(() => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;
      const dims = ce.block.getCropVisualDimensions(editableBlockId);
      if (dims) setCropDimensions(dims);
    }, 200);
    return () => clearInterval(interval);
  }, [activeTool, engineRef, editableBlockId]);

  return {
    enterCropMode,
    exitCropMode,
    handleCropPresetChange,
    handleCropApply,
    handleCropCancel,
    handleResizeDimensions,
    cropDimensions,
  };
}
