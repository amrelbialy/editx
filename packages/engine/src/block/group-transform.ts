/**
 * Pure geometry for real group blocks.
 *
 * A grouped child stores its transform in the group's LOCAL (parent-relative)
 * coordinate space. These helpers convert between a child's absolute (page)
 * transform and its group-local transform, and compute the union bounding box
 * used to place a newly created group. All rotations are in degrees, all
 * positions are top-left anchored (matching how the store persists every block).
 */

export interface Transform2D {
  x: number;
  y: number;
  rotation: number;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SizedTransform extends Transform2D {
  width: number;
  height: number;
}

/**
 * Axis-aligned union of top-left-anchored rects (member rotation is ignored for
 * the group origin — the group is created unrotated, so its origin is simply the
 * min corner of the members' bounds).
 */
export function unionBBox(rects: readonly SizedTransform[]): BBox {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Axis-aligned union of logical rects rotated around their stored top-left. */
export function rotatedUnionBBox(rects: readonly SizedTransform[]): BBox {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    const radians = (rect.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const widthX = rect.width * cos;
    const widthY = rect.width * sin;
    const heightX = -rect.height * sin;
    const heightY = rect.height * cos;
    const x1 = rect.x + widthX;
    const y1 = rect.y + widthY;
    const x2 = rect.x + heightX;
    const y2 = rect.y + heightY;
    const x3 = x1 + heightX;
    const y3 = y1 + heightY;
    minX = Math.min(minX, rect.x, x1, x2, x3);
    minY = Math.min(minY, rect.y, y1, y2, y3);
    maxX = Math.max(maxX, rect.x, x1, x2, x3);
    maxY = Math.max(maxY, rect.y, y1, y2, y3);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Convert an absolute (page-space) transform into a group-local transform. */
export function absoluteToLocal(abs: Transform2D, group: Transform2D): Transform2D {
  const rad = (group.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = abs.x - group.x;
  const dy = abs.y - group.y;
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos,
    rotation: abs.rotation - group.rotation,
  };
}

/** Convert a group-local transform into an absolute (page-space) transform. */
export function localToAbsolute(local: Transform2D, group: Transform2D): Transform2D {
  const rad = (group.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: group.x + local.x * cos - local.y * sin,
    y: group.y + local.x * sin + local.y * cos,
    rotation: local.rotation + group.rotation,
  };
}
