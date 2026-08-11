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
  nodeMap: Map<number, Konva.Node>,
  onZoomChange?: (zoom: number) => void,
): void {
  const container = stage.container();
  container.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      // Only zoom when Ctrl/Cmd is held. Trackpad pinch also sets ctrlKey, so
      // pinch-to-zoom keeps working; plain scroll is ignored.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const oldZoom = camera.getZoom();
      // Cap magnitude so one wheel tick ≈ 2-3 % change.
      const delta = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 50);
      const newZoom = oldZoom * (1 + delta * 0.0015);

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldPt = camera.screenToWorld(pointer);
      let zoomAnchor = pointer;
      for (const [, node] of nodeMap) {
        if (node.getAttr("isPage")) {
          const group = node as Konva.Group;
          const bgRect = group.children?.[0] as Konva.Rect | undefined;
          if (bgRect) {
            const pw = bgRect.width();
            const ph = bgRect.height();
            const px = group.x();
            const py = group.y();
            if (worldPt.x < px || worldPt.x > px + pw || worldPt.y < py || worldPt.y > py + ph) {
              zoomAnchor = camera.worldToScreen({ x: px + pw / 2, y: py + ph / 2 });
            }
          }
          break;
        }
      }
      camera.zoomAtPoint(newZoom, zoomAnchor);
      onZoomChange?.(camera.getZoom());
    },
    { passive: false },
  );
}
