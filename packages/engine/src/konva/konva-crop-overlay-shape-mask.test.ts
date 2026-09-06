import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { KonvaCropOverlayShapeMask } from "./konva-crop-overlay-shape-mask";

function shapeCases(): [string, Konva.Shape][] {
  return [
    ["rect", new Konva.Rect({ width: 100, height: 80, cornerRadius: 12 })],
    ["ellipse", new Konva.Ellipse({ radiusX: 50, radiusY: 40 })],
    ["polygon", new Konva.RegularPolygon({ sides: 6, radius: 50 })],
    ["star", new Konva.Star({ numPoints: 5, innerRadius: 20, outerRadius: 50 })],
    ["path", new Konva.Path({ data: "M0 0 L100 0 L50 80 Z" })],
  ];
}

describe("KonvaCropOverlayShapeMask", () => {
  it.each(shapeCases())("uses the exact %s Konva class for the aperture", (_kind, node) => {
    const visualGroup = new Konva.Group();
    const mask = new KonvaCropOverlayShapeMask(visualGroup);
    const rect = node.getSelfRect();

    mask.sync(node, rect);

    const cutout = visualGroup.findOne(".crop-shape-mask-cutout") as Konva.Shape;
    const outline = visualGroup.findOne(".crop-shape-mask-outline") as Konva.Shape;
    expect(cutout.constructor).toBe(node.constructor);
    expect(outline.constructor).toBe(node.constructor);
    expect(cutout.globalCompositeOperation()).toBe("destination-out");
    expect(outline.fillEnabled()).toBe(false);
  });

  it("maps center-origin geometry into the rectangular proxy frame", () => {
    const visualGroup = new Konva.Group();
    const mask = new KonvaCropOverlayShapeMask(visualGroup);
    const ellipse = new Konva.Ellipse({ radiusX: 50, radiusY: 40 });

    mask.sync(ellipse, ellipse.getSelfRect());
    mask.layout({ x: 0, y: 0, width: 100, height: 80 });

    expect(visualGroup.findOne(".crop-shape-mask")?.position()).toEqual({ x: 50, y: 40 });
    expect(visualGroup.findOne(".crop-shape-mask-outline")?.position()).toEqual({ x: 50, y: 40 });
  });

  it("hit-tests the transformed shape aperture instead of its bounds", () => {
    const visualGroup = new Konva.Group({ x: 120, y: 80, rotation: 30, scaleX: 1.5 });
    const mask = new KonvaCropOverlayShapeMask(visualGroup);
    const ellipse = new Konva.Ellipse({ radiusX: 50, radiusY: 40 });
    mask.sync(ellipse, ellipse.getSelfRect());
    mask.layout({ x: 0, y: 0, width: 100, height: 80 });
    const cutout = visualGroup.findOne(".crop-shape-mask-cutout") as Konva.Shape;
    const transform = cutout.getAbsoluteTransform();
    const center = transform.point({ x: 0, y: 0 });
    const corner = transform.point({ x: 49, y: 39 });
    const intersects = vi
      .spyOn(cutout, "intersects")
      .mockImplementation((point) => point.x === center.x && point.y === center.y);

    expect(mask.containsPoint(center)).toBe(true);
    expect(mask.containsPoint(corner)).toBe(false);
    expect(intersects).toHaveBeenNthCalledWith(1, center);
    expect(intersects).toHaveBeenNthCalledWith(2, corner);
    expect(cutout.globalCompositeOperation()).toBe("destination-out");
    expect(cutout.listening()).toBe(false);
  });
});
