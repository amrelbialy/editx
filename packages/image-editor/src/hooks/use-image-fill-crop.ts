import type { EditxEngine, ImageFillCrop, ImageFillCropUpdate } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImageEditorStore } from "../store/image-editor-store";

interface UseImageFillCropOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  engine: EditxEngine | null;
  enterCropMode: (blockId: number) => void;
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function useImageFillCrop(options: UseImageFillCropOptions) {
  const { engineRef, engine, enterCropMode } = options;
  const sessionEngineRef = useRef(engine);
  const targetBlockIdRef = useRef<number | null>(null);

  const setActiveTool = useImageEditorStore((state) => state.setActiveTool);
  const setPropertySidePanel = useImageEditorStore((state) => state.setPropertySidePanel);

  const [targetBlockId, setTargetBlockId] = useState<number | null>(null);
  const [crop, setCrop] = useState<ImageFillCrop | null>(null);

  const finish = useCallback(
    (blockId: number) => {
      const current = engineRef.current;
      current?.editor.fitToScreen();
      current?.block.select(blockId);
      targetBlockIdRef.current = null;
      setTargetBlockId(null);
      setCrop(null);
      setActiveTool("select");
    },
    [engineRef, setActiveTool],
  );

  const enter = useCallback(
    (blockId: number) => {
      const current = engineRef.current;
      if (!current || current.editor.getCropEditTarget(blockId) !== "image-fill") return;
      setPropertySidePanel(null);
      enterCropMode(blockId);
      targetBlockIdRef.current = blockId;
      setTargetBlockId(blockId);
      setCrop(current.editor.getImageFillCrop());
    },
    [engineRef, enterCropMode, setPropertySidePanel],
  );

  const apply = useCallback(() => {
    const current = engineRef.current;
    const blockId = targetBlockIdRef.current;
    if (!current || blockId === null) return;
    current.editor.commitCrop();
    if (targetBlockIdRef.current !== null) finish(blockId);
  }, [engineRef, finish]);

  const cancel = useCallback(() => {
    const current = engineRef.current;
    const blockId = targetBlockIdRef.current;
    if (!current || blockId === null) return;
    current.editor.cancelCrop();
    if (targetBlockIdRef.current !== null) finish(blockId);
  }, [engineRef, finish]);

  const update = useCallback(
    (change: ImageFillCropUpdate) => {
      setCrop(engineRef.current?.editor.updateImageFillCrop(change) ?? null);
    },
    [engineRef],
  );

  const reset = useCallback(() => {
    setCrop(engineRef.current?.editor.resetImageFillCrop() ?? null);
  }, [engineRef]);

  const rotateLeft = useCallback(() => {
    if (crop) update({ rotation: normalizeRotation(crop.rotation - 90) });
  }, [crop, update]);

  const rotateRight = useCallback(() => {
    if (crop) update({ rotation: normalizeRotation(crop.rotation + 90) });
  }, [crop, update]);

  const flipHorizontal = useCallback(() => {
    if (crop) update({ flipHorizontal: !crop.flipHorizontal });
  }, [crop, update]);

  const flipVertical = useCallback(() => {
    if (crop) update({ flipVertical: !crop.flipVertical });
  }, [crop, update]);

  useEffect(() => {
    if (sessionEngineRef.current === engine) return;
    sessionEngineRef.current = engine;
    targetBlockIdRef.current = null;
    setTargetBlockId(null);
    setCrop(null);
    setActiveTool("select");
  }, [engine, setActiveTool]);

  useEffect(() => {
    if (!engine) return;
    return engine.editor.onImageFillCropChanged((change) => {
      if (change.blockId === targetBlockId) setCrop(change.crop);
    });
  }, [engine, targetBlockId]);

  useEffect(() => {
    if (!engine) return;
    return engine.onEditModeChanged(({ mode, previousMode }) => {
      const blockId = targetBlockIdRef.current;
      if (blockId !== null && previousMode === "Crop" && mode !== "Crop") finish(blockId);
    });
  }, [engine, finish]);

  return {
    isActive: targetBlockId !== null,
    targetBlockId,
    crop,
    enter,
    apply,
    cancel,
    reset,
    update,
    rotateLeft,
    rotateRight,
    flipHorizontal,
    flipVertical,
  };
}
