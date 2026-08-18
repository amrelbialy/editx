import Konva from "konva";
import { describe, expect, it } from "vitest";
import { SIZE_HEIGHT, SIZE_WIDTH } from "../block/property-keys";
import {
  applyImageFillCropPreviewFrame,
  createImageFillCropPreview,
  destroyImageFillCropPreview,
} from "./konva-image-fill-crop-preview";
import type { KonvaNodeFactory } from "./konva-node-factory";

const shapes = [
  new Konva.Rect({ width: 100, height: 80 }),
  new Konva.Ellipse({ radiusX: 50, radiusY: 40 }),
  new Konva.RegularPolygon({ sides: 5, radius: 50 }),
  new Konva.Star({ numPoints: 5, innerRadius: 20, outerRadius: 50 }),
  new Konva.Path({ data: "M0 0 L100 0 L50 80 Z" }),
];

describe("image fill crop preview", () => {
  it.each(shapes)("clones and restores a $className graphic", (sourceNode) => {
    const parent = new Konva.Group();
    parent.add(sourceNode);

    const preview = createImageFillCropPreview(sourceNode);

    expect(preview).not.toBeNull();
    expect(preview?.node.constructor).toBe(sourceNode.constructor);
    expect(preview?.group.getParent()).toBe(parent);
    expect(preview?.node.getParent()).toBe(preview?.group);
    expect(preview?.plane.getParent()).toBe(preview?.group);
    expect(preview?.node.draggable()).toBe(false);
    expect(sourceNode.visible()).toBe(false);

    if (preview) destroyImageFillCropPreview(preview);
    expect(sourceNode.visible()).toBe(true);
    expect(parent.children).toEqual([sourceNode]);
  });

  it("shows the preview while preserving a hidden source state", () => {
    const parent = new Konva.Group();
    const sourceNode = new Konva.Rect({ visible: false });
    parent.add(sourceNode);

    const preview = createImageFillCropPreview(sourceNode);

    expect(preview?.node.visible()).toBe(true);
    if (preview) destroyImageFillCropPreview(preview);
    expect(sourceNode.visible()).toBe(false);
  });

  it("applies live geometry and invalidates image requests started by the updater", () => {
    const sourceNode = new Konva.Rect();
    new Konva.Group().add(sourceNode);
    const preview = createImageFillCropPreview(sourceNode)!;
    const nodeFactory = {
      updateNode: (node: Konva.Node, block: { properties: Record<string, unknown> }) => {
        (node as Konva.Shape).size({
          width: block.properties[SIZE_WIDTH] as number,
          height: block.properties[SIZE_HEIGHT] as number,
        });
        node.setAttr("__fillImageRequest", { stale: true });
      },
    } as unknown as KonvaNodeFactory;

    applyImageFillCropPreviewFrame(
      nodeFactory,
      () => ({ type: "graphic", properties: {} }),
      7,
      { x: 0, y: 0, width: 100, height: 160 },
      preview,
    );

    expect(preview.node.size()).toEqual({ width: 100, height: 160 });
    expect(preview.node.getAttr("__fillImageRequest")).toBeUndefined();
  });
});
