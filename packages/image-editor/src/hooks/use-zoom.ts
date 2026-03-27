import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";

interface UseZoomOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  engine: EditxEngine | null;
}

export function useZoom({ engineRef, engine }: UseZoomOptions) {
  const [zoomPercent, setZoomPercent] = useState<number | null>(null);

  const updateZoomLabel = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    setZoomPercent(Math.round(ce.editor.getZoom() * 100));
  }, [engineRef]);

  const handleZoomIn = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const target = ce.editor.getZoom() * 1.25;
    ce.editor.setZoom(target, true);
    setZoomPercent(Math.round(target * 100));
  }, [engineRef]);

  const handleZoomOut = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const target = ce.editor.getZoom() * 0.8;
    ce.editor.setZoom(target, true);
    setZoomPercent(Math.round(target * 100));
  }, [engineRef]);

  const handleAutoFitPage = useCallback(() => {
    engineRef.current?.editor.fitToScreen(24, true);
    updateZoomLabel();
  }, [engineRef, updateZoomLabel]);

  const handleFitPage = useCallback(() => {
    engineRef.current?.editor.fitToScreen(0, true);
    updateZoomLabel();
  }, [engineRef, updateZoomLabel]);

  const handleFitSelection = useCallback(() => {
    engineRef.current?.editor.fitToSelection(24, true);
    updateZoomLabel();
  }, [engineRef, updateZoomLabel]);

  const handleZoomPreset = useCallback(
    (factor: number) => {
      const ce = engineRef.current;
      if (!ce) return;
      ce.editor.setZoom(factor, true);
      setZoomPercent(Math.round(factor * 100));
    },
    [engineRef],
  );

  const handleZoom100 = useCallback(() => {
    handleZoomPreset(1);
  }, [handleZoomPreset]);

  useEffect(() => {
    if (engine) updateZoomLabel();
  }, [engine, updateZoomLabel]);

  useEffect(() => {
    if (!engine) return;
    return engine.onZoomChanged(() => updateZoomLabel());
  }, [engine, updateZoomLabel]);

  const zoomLabel = zoomPercent !== null ? `${zoomPercent}%` : "Auto";

  return {
    zoomLabel,
    handleZoomIn,
    handleZoomOut,
    handleAutoFitPage,
    handleFitPage,
    handleFitSelection,
    handleZoomPreset,
    handleZoom100,
  };
}
