import { useCallback, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';

export interface RotationState {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export interface UseRotateFlipToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useRotateFlipTool({ engineRef }: UseRotateFlipToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const [rotationState, setRotationState] = useState<RotationState>({ rotation: 0, flipH: false, flipV: false });

  const syncRotationState = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    setRotationState({
      rotation: ce.block.getImageRotation(editableBlockId),
      flipH: ce.block.isCropFlippedHorizontal(editableBlockId),
      flipV: ce.block.isCropFlippedVertical(editableBlockId),
    });
  }, [engineRef, editableBlockId]);

  const handleRotationChange = useCallback((angle: number) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.setImageRotation(editableBlockId, angle);
    setRotationState((prev) => ({ ...prev, rotation: angle }));
  }, [engineRef, editableBlockId]);

  const handleRotateClockwise = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.rotateClockwise(editableBlockId);
    ce.editor.fitToScreen();
    syncRotationState();
  }, [engineRef, editableBlockId, syncRotationState]);

  const handleRotateCounterClockwise = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.rotateCounterClockwise(editableBlockId);
    ce.editor.fitToScreen();
    syncRotationState();
  }, [engineRef, editableBlockId, syncRotationState]);

  const handleFlipHorizontal = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.flipCropHorizontal(editableBlockId);
    setRotationState((prev) => ({ ...prev, flipH: !prev.flipH }));
  }, [engineRef, editableBlockId]);

  const handleFlipVertical = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.flipCropVertical(editableBlockId);
    setRotationState((prev) => ({ ...prev, flipV: !prev.flipV }));
  }, [engineRef, editableBlockId]);

  const handleRotateReset = useCallback(() => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;
    ce.block.resetRotationAndFlip(editableBlockId);
    ce.editor.fitToScreen();
    setRotationState({ rotation: 0, flipH: false, flipV: false });
  }, [engineRef, editableBlockId]);

  return {
    rotationState,
    syncRotationState,
    handleRotationChange,
    handleRotateClockwise,
    handleRotateCounterClockwise,
    handleFlipHorizontal,
    handleFlipVertical,
    handleRotateReset,
  };
}
