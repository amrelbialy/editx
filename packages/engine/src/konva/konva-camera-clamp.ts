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

export interface CameraCenterRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CameraPageBounds {
  width: number;
  height: number;
  /** Optional world-space centers reachable at the viewport center. */
  centerRange?: CameraCenterRange;
}

export interface ClampPanOpts {
  stageW: number;
  stageH: number;
  zoom: number;
  /** World-space page size, or null when unknown (no clamping applied). */
  pageSize: CameraPageBounds | null;
}

function clampAxis(
  pan: number,
  stageSize: number,
  contentSize: number,
  zoom: number,
  minCenter?: number,
  maxCenter?: number,
): number {
  const screenSize = contentSize * zoom;
  let minPan = screenSize <= stageSize ? (stageSize - screenSize) / 2 : stageSize - screenSize;
  let maxPan = screenSize <= stageSize ? minPan : 0;
  if (minCenter !== undefined && maxCenter !== undefined) {
    minPan = Math.min(minPan, stageSize / 2 - maxCenter * zoom);
    maxPan = Math.max(maxPan, stageSize / 2 - minCenter * zoom);
  }
  return Math.min(maxPan, Math.max(minPan, pan));
}

/**
 * Clamp pan so the page stays centered when it fits in the viewport, or can't
 * be panned past its edges when zoomed in. Returns the (possibly adjusted) pan.
 */
export function clampPan(pan: Vec2, opts: ClampPanOpts): Vec2 {
  const { stageW, stageH, zoom, pageSize } = opts;
  if (!pageSize) return pan;
  const range = pageSize.centerRange;
  return {
    x: clampAxis(pan.x, stageW, pageSize.width, zoom, range?.minX, range?.maxX),
    y: clampAxis(pan.y, stageH, pageSize.height, zoom, range?.minY, range?.maxY),
  };
}
