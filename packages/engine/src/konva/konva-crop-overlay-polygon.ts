import type { Box } from "./konva-crop-overlay-layout";

interface Point {
  x: number;
  y: number;
}

function boxCorners(box: Box): Point[] {
  const cos = Math.cos(box.rotation);
  const sin = Math.sin(box.rotation);
  const width = { x: box.width * cos, y: box.width * sin };
  const height = { x: -box.height * sin, y: box.height * cos };
  return [
    { x: box.x, y: box.y },
    { x: box.x + width.x, y: box.y + width.y },
    { x: box.x + width.x + height.x, y: box.y + width.y + height.y },
    { x: box.x + height.x, y: box.y + height.y },
  ];
}

function isInside(point: Point, polygon: Point[]): boolean {
  let sign = 0;
  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const cross = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
    if (Math.abs(cross) < 0.001) continue;
    const nextSign = Math.sign(cross);
    if (sign !== 0 && nextSign !== sign) return false;
    sign = nextSign;
  }
  return true;
}

function isBoxInside(box: Box, polygon: Point[]): boolean {
  return boxCorners(box).every((point) => isInside(point, polygon));
}

function interpolate(oldBox: Box, newBox: Box, progress: number): Box {
  return {
    x: oldBox.x + (newBox.x - oldBox.x) * progress,
    y: oldBox.y + (newBox.y - oldBox.y) * progress,
    width: oldBox.width + (newBox.width - oldBox.width) * progress,
    height: oldBox.height + (newBox.height - oldBox.height) * progress,
    rotation: newBox.rotation,
  };
}

export function constrainBoxToPolygon(
  oldBox: Box,
  newBox: Box,
  polygon: Point[],
  minimum: number,
): Box {
  if (Math.abs(newBox.width) < minimum || Math.abs(newBox.height) < minimum) return oldBox;
  if (isBoxInside(newBox, polygon)) return newBox;
  if (!isBoxInside(oldBox, polygon)) return oldBox;

  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index++) {
    const middle = (low + high) / 2;
    if (isBoxInside(interpolate(oldBox, newBox, middle), polygon)) low = middle;
    else high = middle;
  }
  return interpolate(oldBox, newBox, low);
}
