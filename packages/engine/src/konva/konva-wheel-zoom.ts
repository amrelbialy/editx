import type Konva from "konva";
import type { KonvaCamera } from "./konva-camera";

/**
 * Ctrl/Cmd + wheel zoom, anchored at the pointer (or the page center when the
 * pointer is outside the page). Extracted from the interaction handler to keep
 * each concern in its own file.
 */
export function setupWheelZoom(
  stage: Konva.Stage,
  camera: KonvaCamera,
  _nodeMap: Map<number, Konva.Node>,
  onZoomChange?: (zoom: number) => void,
  getPageViewMode?: () => string,
): void {
  const container = stage.container();
  container.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        const mode = getPageViewMode?.();
        if (mode !== "vertical-pages" && mode !== "horizontal-pages") return;
        e.preventDefault();
        if (mode === "vertical-pages") {
          camera.panBy(-e.deltaX, -e.deltaY);
        } else {
          camera.panBy(-(e.deltaX + e.deltaY), 0);
        }
        return;
      }

      e.preventDefault();
      const oldZoom = camera.getZoom();
      // Cap magnitude so one wheel tick ≈ 2-3 % change.
      const delta = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50);
      const newZoom = oldZoom * (1 + delta * 0.0015);

      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      camera.zoomAtPoint(newZoom, pointer);
      onZoomChange?.(camera.getZoom());
    },
    { passive: false },
  );
}
