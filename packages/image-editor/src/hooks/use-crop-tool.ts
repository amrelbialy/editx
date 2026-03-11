import { useCallback } from 'react';
import { toPrecisedFloat, type CreativeEngine } from '@creative-editor/engine';
import { useImageEditorStore, type CropPresetId } from '../store/image-editor-store';

export interface UseCropToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useCropTool({ engineRef }: UseCropToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);

  const resolveRatio = useCallback((presetId: CropPresetId): number | null => {
    const originalImage = useImageEditorStore.getState().originalImage;
    switch (presetId) {
      case 'free': return null;
      case 'original': return originalImage ? toPrecisedFloat(originalImage.width / originalImage.height) : null;
      case '1:1': return 1;
      case '4:3': return toPrecisedFloat(4 / 3);
      case '3:4': return toPrecisedFloat(3 / 4);
      case '16:9': return toPrecisedFloat(16 / 9);
      case '9:16': return toPrecisedFloat(9 / 16);
      default: return null;
    }
  }, []);

  const enterCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.editor.setEditMode('Crop', { blockId: editableBlockId });
    setCropPreset('free');
    setActiveTool('crop');
  }, [engineRef, editableBlockId, setCropPreset, setActiveTool]);

  const exitCropMode = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode('Transform');
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [engineRef, setActiveTool]);

  const handleCropPresetChange = useCallback((presetId: CropPresetId) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    const ratio = resolveRatio(presetId);
    ce.block.applyCropRatio(editableBlockId, ratio);
  }, [engineRef, resolveRatio, editableBlockId]);

  const handleCropApply = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode('Transform');
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [engineRef, setActiveTool]);

  const handleCropCancel = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.setEditMode('Transform');
    ce.editor.undo();
    ce.editor.fitToScreen();
    setActiveTool('select');
  }, [engineRef, setActiveTool]);

  return {
    enterCropMode,
    exitCropMode,
    handleCropPresetChange,
    handleCropApply,
    handleCropCancel,
  };
}
