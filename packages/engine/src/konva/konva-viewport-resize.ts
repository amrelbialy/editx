import type Konva from "konva";
import type { KonvaCamera } from "./konva-camera";

export interface ViewportResizeDeps {
  rootEl: HTMLElement;
  stage: Konva.Stage;
  camera: KonvaCamera;
  /** Current page size, used only for the initial auto-fit. */
  getPageSize: () => { width: number; height: number } | undefined;
}

/**
 * Observe the container and keep the Konva stage sized to it.
 *
 * On the very first valid (non-zero) layout the page is auto-fit to the
 * viewport. Every subsequent resize preserves the user's existing zoom/pan
 * and only re-clamps it for the new stage size (routed through the camera's
 * unified clamp path via {@link KonvaCamera.reapplyViewport}) — so a resize
 * never destroys a pan/zoom the user has set.
 */
export function observeViewportResize(deps: ViewportResizeDeps): ResizeObserver {
  let hasFitOnce = false;

  const observer = new ResizeObserver(() => {
    const w = deps.rootEl.clientWidth;
    const h = deps.rootEl.clientHeight;
    if (w === 0 || h === 0) return;
    deps.stage.width(w);
    deps.stage.height(h);

    const pageSize = deps.getPageSize();
    if (!hasFitOnce && pageSize) {
      deps.camera.fitToScreen({ ...pageSize, padding: 48 });
      hasFitOnce = true;
    } else {
      deps.camera.reapplyViewport();
    }
  });

  observer.observe(deps.rootEl);
  return observer;
}
