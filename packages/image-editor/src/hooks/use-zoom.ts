import type { EditxEngine } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";

interface UseZoomOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  engine: EditxEngine | null;
}

function isContinuousPageView(engine: EditxEngine): boolean {
  const mode = engine.editor.getPageViewMode();
  return mode === "vertical-pages" || mode === "horizontal-pages";
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
    const ce = engineRef.current;
    if (!ce) return;
    ce.editor.fitToScreen(isContinuousPageView(ce) ? 48 : 24, true);
    updateZoomLabel();
  }, [engineRef, updateZoomLabel]);

  const handleFitPage = useCallback(() => {
    engineRef.current?.editor.fitToScreen(0, true);
    updateZoomLabel();
  }, [engineRef, updateZoomLabel]);

  const handleFitSelection = useCallback(() => {
    const ce = engineRef.current;
    if (!ce) return;
    const pageSelected = ce.block.findAllSelected().some((id) => ce.block.getType(id) === "page");
    ce.editor.fitToSelection(isContinuousPageView(ce) && pageSelected ? 48 : 24, true);
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
