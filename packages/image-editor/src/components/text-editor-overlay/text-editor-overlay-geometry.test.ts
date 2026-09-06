import { describe, expect, it } from "vitest";
import { toOverlayPositionStyle } from "./text-editor-overlay-geometry";

describe("toOverlayPositionStyle", () => {
  it("preserves translated and rotated grouped-text geometry", () => {
    const style = toOverlayPositionStyle(
      { a: 0, b: 1, c: -1, d: 0, e: 140, f: 80 },
      { x: 5, y: 10, zoom: 1, rotation: 0 },
    );

    expect(style).toMatchObject({
      left: 0,
      top: 0,
      transform: "matrix(0, 1, -1, 0, 140, 80)",
      transformOrigin: "top left",
    });
  });

  it("preserves zoom in the full screen transform", () => {
    const style = toOverlayPositionStyle(
      { a: 1.5, b: 0, c: 0, d: 1.5, e: 25, f: 40 },
      { x: 5, y: 10, zoom: 1, rotation: 0 },
    );

    expect(style.transform).toBe("matrix(1.5, 0, 0, 1.5, 25, 40)");
  });

  it("falls back to local geometry for renderers without a transform query", () => {
    expect(toOverlayPositionStyle(null, { x: 12, y: 18, zoom: 2, rotation: 30 })).toMatchObject({
      left: 12,
      top: 18,
      transform: "scale(2) rotate(30deg)",
    });
  });
});
