import { type EditxEngine, toPrecisedFloat } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import type { ImageEditorConfig } from "../config/config.types";
import { type CropPresetId, useImageEditorStore } from "../store/image-editor-store";

export interface UseCropToolOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  config: ImageEditorConfig;
}

export function useCropTool({ engineRef, config }: UseCropToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setEditingTextBlockId = useImageEditorStore((s) => s.setEditingTextBlockId);
  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  /** Current crop overlay dimensions (synced from overlay on every change). */
  const [cropDimensions, setCropDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [activeCropBlockId, setActiveCropBlockId] = useState<number | null>(null);
  const cropBlockId = activeCropBlockId ?? editableBlockId;

  const resolveRatio = useCallback(
    (presetId: CropPresetId): number | null => {
      const preset = config.crop?.aspectRatios?.find((p) => p.id === presetId);
      const ratio = preset?.ratio;
      if (ratio == null || ratio === "free") return null;
      if (ratio === "original") {
        const imageFillCrop = engineRef.current?.editor.getImageFillCrop();
        if (imageFillCrop) return imageFillCrop.sourceAspectRatio ?? null;
        const originalImage = useImageEditorStore.getState().originalImage;
        return originalImage ? toPrecisedFloat(originalImage.width / originalImage.height) : null;
      }
      return toPrecisedFloat(ratio);
    },
    [config.crop?.aspectRatios, engineRef],
  );

  const enterCropMode = useCallback(
    (blockId?: number) => {
      const ce = engineRef.current;
      const targetId = blockId ?? editableBlockId;
      if (!ce || targetId === null) return;
      // Close any block-level UI (text editing, selection-driven bars) so it
      // doesn't linger on top of the crop overlay.
      setEditingTextBlockId(null);
      setTextSelectionRange(null);
      ce.block.deselectAll();
      ce.editor.setEditMode("Crop", { blockId: targetId });
      setActiveCropBlockId(targetId);
      setCropPreset("free");
      setActiveTool("crop");
      // Read initial crop dimensions
      const dims = ce.block.getCropVisualDimensions(targetId);
      if (dims) setCropDimensions(dims);
    },
    [
      engineRef,
      editableBlockId,
      setCropPreset,
      setActiveTool,
      setEditingTextBlockId,
      setTextSelectionRange,
    ],
  );

  const exitCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode("Transform");
    ce.editor.fitToScreen();
    setActiveTool("select");
    setActiveCropBlockId(null);
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  const handleCropPresetChange = useCallback(
    (presetId: CropPresetId) => {
      const ce = engineRef.current;
      if (!ce || cropBlockId === null) return;
      const ratio = resolveRatio(presetId);
      ce.block.applyCropRatio(cropBlockId, ratio);
      // Sync dimensions after ratio change
      const dims = ce.block.getCropVisualDimensions(cropBlockId);
      if (dims) setCropDimensions(dims);
    },
    [engineRef, resolveRatio, cropBlockId],
  );

  const handleCropApply = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.commitCrop();
    ce.editor.fitToScreen();
    setActiveTool("select");
    setActiveCropBlockId(null);
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  const handleCropCancel = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.cancelCrop();
    ce.editor.fitToScreen();
    setActiveTool("select");
    setActiveCropBlockId(null);
    setCropDimensions(null);
  }, [engineRef, setActiveTool]);

  // ── Resize-tab handlers ──

  /** Set the crop overlay to exact pixel dimensions. */
  const handleResizeDimensions = useCallback(
    (width: number, height: number) => {
      const ce = engineRef.current;
      if (!ce || cropBlockId === null) return;
      ce.block.applyCropDimensions(cropBlockId, width, height);
      // Read back the actual clamped dimensions
      const dims = ce.block.getCropVisualDimensions(cropBlockId);
      if (dims) setCropDimensions(dims);
    },
    [engineRef, cropBlockId],
  );

  // Poll crop overlay dimensions while in crop mode so inputs stay in sync
  // with manual overlay dragging.
  useEffect(() => {
    if (activeTool !== "crop") return;
    const interval = setInterval(() => {
      const ce = engineRef.current;
      if (!ce || cropBlockId === null) return;
      const dims = ce.block.getCropVisualDimensions(cropBlockId);
      if (dims) setCropDimensions(dims);
    }, 200);
    return () => clearInterval(interval);
  }, [activeTool, engineRef, cropBlockId]);

  useEffect(() => {
    if (activeTool !== "crop" && activeCropBlockId !== null) {
      setActiveCropBlockId(null);
      setCropDimensions(null);
    }
  }, [activeTool, activeCropBlockId]);

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
