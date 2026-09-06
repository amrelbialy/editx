import type React from "react";

export interface ScreenTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function toOverlayPositionStyle(
  transform: ScreenTransform | null,
  fallback: { x: number; y: number; zoom: number; rotation: number } | null,
): React.CSSProperties {
  if (transform) {
    const { a, b, c, d, e, f } = transform;
    return {
      left: 0,
      top: 0,
      transform: `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
      transformOrigin: "top left",
    };
  }
  if (!fallback) return { display: "none" };
  return {
    left: fallback.x,
    top: fallback.y,
    transform: `scale(${fallback.zoom}) rotate(${fallback.rotation}deg)`,
    transformOrigin: "top left",
  };
}
