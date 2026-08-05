import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import type { KonvaCamera } from "./konva-camera";

export interface ViewportResizeDeps {
  rootEl: HTMLElement;
  stage: Konva.Stage;
  camera: KonvaCamera;
  /** Current page size, used only for the initial auto-fit. */
  getPageSize: () => { width: number; height: number } | undefined;
  /**
   * World-space rect the camera should stay fitted to while crop mode is
   * active, or `null` when not cropping. When present, a resize re-fits to
   * this rect instead of preserving the viewport — the crop framing is
   * decided by the engine, not the user, and must survive the stage-size
   * change that opening the crop panel triggers.
   */
  getCropFitRect?: () => CropRect | null;
}

/**
 * Observe the container and keep the Konva stage sized to it.
 *
 * On the very first valid (non-zero) layout the page is auto-fit to the
 * viewport. Every subsequent resize preserves the user's existing zoom/pan
 * and only re-clamps it for the new stage size (routed through the camera's
 * unified clamp path via {@link KonvaCamera.reapplyViewport}) — so a resize
 * never destroys a pan/zoom the user has set.
 *
 * The one exception is crop mode: while {@link ViewportResizeDeps.getCropFitRect}
 * returns a rect, a resize re-fits the camera to it. Opening the crop panel
 * shrinks the canvas *after* the initial fit runs, so without this the image
 * would stay fitted to the pre-panel (wider) stage and spill under the panel.
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
    const cropFitRect = deps.getCropFitRect?.();
    if (!hasFitOnce && pageSize) {
      deps.camera.fitToScreen({ ...pageSize, padding: 48 });
      hasFitOnce = true;
    } else if (cropFitRect) {
      deps.camera.fitToRect(cropFitRect, 24);
    } else {
      deps.camera.reapplyViewport();
    }
  });

  observer.observe(deps.rootEl);
  return observer;
}
