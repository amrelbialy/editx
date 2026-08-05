/**
 * Pure clamping helpers for {@link KonvaCamera}. Kept separate so the camera
 * class stays focused on state/transform orchestration and the clamp math can
 * be unit-tested in isolation.
 */

/** Minimum zoom factor (5%). Shared so callers don't hardcode clamp bounds. */
export const MIN_ZOOM = 0.05;
/** Maximum zoom factor (2000%). Shared so callers don't hardcode clamp bounds. */
export const MAX_ZOOM = 20;

/** Clamp a raw zoom value into the supported [MIN_ZOOM, MAX_ZOOM] range. */
export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface ClampPanOpts {
  stageW: number;
  stageH: number;
  zoom: number;
  /** World-space page size, or null when unknown (no clamping applied). */
  pageSize: { width: number; height: number } | null;
}

/**
 * Clamp pan so the page stays centered when it fits in the viewport, or can't
 * be panned past its edges when zoomed in. Returns the (possibly adjusted) pan.
 */
export function clampPan(pan: Vec2, opts: ClampPanOpts): Vec2 {
  const { stageW, stageH, zoom, pageSize } = opts;
  if (!pageSize) return pan;

  const pageScreenW = pageSize.width * zoom;
  const pageScreenH = pageSize.height * zoom;
  const result: Vec2 = { x: pan.x, y: pan.y };

  // Horizontal: if page narrower than viewport, center it; otherwise clamp edges
  if (pageScreenW <= stageW) {
    result.x = (stageW - pageScreenW) / 2;
  } else {
    result.x = Math.min(0, Math.max(stageW - pageScreenW, pan.x));
  }

  // Vertical: same logic
  if (pageScreenH <= stageH) {
    result.y = (stageH - pageScreenH) / 2;
  } else {
    result.y = Math.min(0, Math.max(stageH - pageScreenH, pan.y));
  }

  return result;
}
