/**
 * Rotation math utilities.
 *
 * Pure functions for computing bounding boxes and offsets after rotation.
 * Reference: standard rotation geometry algorithms.
 */

/**
 * Compute the axis-aligned bounding box of a rectangle after rotation.
 *
 * Given a rectangle of `width × height` rotated by `angleDeg` degrees,
 * returns the dimensions of the smallest axis-aligned box that contains
 * the rotated rectangle.
 *
 * Uses the standard formula:
 * newWidth = |w·cos(θ)| + |h·sin(θ)|
 * newHeight = |w·sin(θ)| + |h·cos(θ)|
 */
export function getSizeAfterRotation(
 width: number,
 height: number,
 angleDeg: number,
): { width: number; height: number } {
 const angleRad = (angleDeg * Math.PI) / 180;
 const cosA = Math.abs(Math.cos(angleRad));
 const sinA = Math.abs(Math.sin(angleRad));

 return {
 width: Math.round((width * cosA + height * sinA) * 100) / 100,
 height: Math.round((width * sinA + height * cosA) * 100) / 100,
 };
}

/**
 * Clamp a rotation angle to the range [-180, 180].
 */
export function clampRotation(angle: number): number {
 return Math.max(-180, Math.min(180, angle));
}

/**
 * Normalize an angle to the range [-180, 180] by wrapping.
 * E.g. 270 → -90, -270 → 90.
 */
export function normalizeRotation(angle: number): number {
 let a = angle % 360;
 if (a > 180) a -= 360;
 if (a < -180) a += 360;
 return a;
}

/**
 * Check if an angle is a multiple of 90°.
 */
export function isRightAngle(angleDeg: number): boolean {
 return Math.abs(angleDeg % 90) < 0.001;
}

/**
 * For exact 90° / 270° rotations, swap width and height.
 * For 0° / 180°, dimensions stay the same.
 * For other angles, compute the AABB.
 */
export function getPageDimsAfterRotation(
 width: number,
 height: number,
 angleDeg: number,
): { width: number; height: number } {
 const normalized = normalizeRotation(angleDeg);
 const abs = Math.abs(normalized);

 // Exact 90° / 270° — swap dimensions
 if (Math.abs(abs - 90) < 0.001) {
 return { width: height, height: width };
 }

 // 0° / 180° — dimensions unchanged
 if (abs < 0.001 || Math.abs(abs - 180) < 0.001) {
 return { width, height };
 }

 // Arbitrary angle — compute AABB
 return getSizeAfterRotation(width, height, angleDeg);
}

// ── Crop ↔ Visual coordinate transforms ──────────────────────────

/**
 * Map a source-image-space point to visual (post-rotation/flip) space.
 *
 * The transform matches Konva's render pipeline:
 * 1. Center on source image 2. Flip 3. Rotate 4. Re-center on visual bounds.
 */
function sourcePointToVisual(
 sx: number,
 sy: number,
 origW: number,
 origH: number,
 rotDeg: number,
 flipH: boolean,
 flipV: boolean,
): { x: number; y: number } {
 let px = sx - origW / 2;
 let py = sy - origH / 2;

 if (flipH) px = -px;
 if (flipV) py = -py;

 const angle = normalizeRotation(rotDeg);
 let rx: number, ry: number;

 if (Math.abs(angle) < 0.001) {
 rx = px;
 ry = py;
 } else if (Math.abs(angle - 90) < 0.001) {
 rx = -py;
 ry = px;
 } else if (Math.abs(angle + 90) < 0.001) {
 rx = py;
 ry = -px;
 } else if (Math.abs(Math.abs(angle) - 180) < 0.001) {
 rx = -px;
 ry = -py;
 } else {
 const rad = (angle * Math.PI) / 180;
 rx = px * Math.cos(rad) - py * Math.sin(rad);
 ry = px * Math.sin(rad) + py * Math.cos(rad);
 }

 const isSwap = Math.abs(Math.round(angle / 90)) % 2 === 1;
 const visualW = isSwap ? origH : origW;
 const visualH = isSwap ? origW : origH;

 return { x: visualW / 2 + rx, y: visualH / 2 + ry };
}

/**
 * Map a visual-space point back to source-image space.
 * Inverse of sourcePointToVisual.
 */
function visualPointToSource(
 vx: number,
 vy: number,
 origW: number,
 origH: number,
 rotDeg: number,
 flipH: boolean,
 flipV: boolean,
): { x: number; y: number } {
 const angle = normalizeRotation(rotDeg);
 const isSwap = Math.abs(Math.round(angle / 90)) % 2 === 1;
 const visualW = isSwap ? origH : origW;
 const visualH = isSwap ? origW : origH;

 const rx = vx - visualW / 2;
 const ry = vy - visualH / 2;

 // Inverse rotation
 let px: number, py: number;
 if (Math.abs(angle) < 0.001) {
 px = rx;
 py = ry;
 } else if (Math.abs(angle - 90) < 0.001) {
 px = ry;
 py = -rx;
 } else if (Math.abs(angle + 90) < 0.001) {
 px = -ry;
 py = rx;
 } else if (Math.abs(Math.abs(angle) - 180) < 0.001) {
 px = -rx;
 py = -ry;
 } else {
 const rad = (-angle * Math.PI) / 180;
 px = rx * Math.cos(rad) - ry * Math.sin(rad);
 py = rx * Math.sin(rad) + ry * Math.cos(rad);
 }

 // Inverse flip
 if (flipH) px = -px;
 if (flipV) py = -py;

 return { x: px + origW / 2, y: py + origH / 2 };
}

export interface CropTransformRect {
 x: number;
 y: number;
 width: number;
 height: number;
}

/**
 * Transform a crop rectangle from source-image space to visual (rotated/flipped) space.
 */
export function sourceCropToVisual(
 crop: CropTransformRect,
 origW: number,
 origH: number,
 rotDeg: number,
 flipH: boolean,
 flipV: boolean,
): CropTransformRect {
 const p1 = sourcePointToVisual(crop.x, crop.y, origW, origH, rotDeg, flipH, flipV);
 const p2 = sourcePointToVisual(
 crop.x + crop.width,
 crop.y + crop.height,
 origW,
 origH,
 rotDeg,
 flipH,
 flipV,
 );
 const minX = Math.min(p1.x, p2.x);
 const minY = Math.min(p1.y, p2.y);
 return {
 x: minX,
 y: minY,
 width: Math.max(p1.x, p2.x) - minX,
 height: Math.max(p1.y, p2.y) - minY,
 };
}

/**
 * Transform a crop rectangle from visual (rotated/flipped) space back to source-image space.
 */
export function visualCropToSource(
 crop: CropTransformRect,
 origW: number,
 origH: number,
 rotDeg: number,
 flipH: boolean,
 flipV: boolean,
): CropTransformRect {
 const p1 = visualPointToSource(crop.x, crop.y, origW, origH, rotDeg, flipH, flipV);
 const p2 = visualPointToSource(
 crop.x + crop.width,
 crop.y + crop.height,
 origW,
 origH,
 rotDeg,
 flipH,
 flipV,
 );
 const minX = Math.min(p1.x, p2.x);
 const minY = Math.min(p1.y, p2.y);
 return {
 x: minX,
 y: minY,
 width: Math.max(p1.x, p2.x) - minX,
 height: Math.max(p1.y, p2.y) - minY,
 };
}
