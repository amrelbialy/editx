/**
 * @vitest-environment node
 *
 * Geometry + fill wiring for updatePathNode. A fake Konva.Path double is used
 * (mirrors konva-image-updater.test.ts / konva-export.test.ts) so the
 * unit test needs no real canvas backend, and the shared fill resolver is
 * spied to assert the FillBox seam paths reuse.
 */

import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import {
  SHAPE_PATH_DATA,
  SHAPE_PATH_PRESERVE_ASPECT,
  SHAPE_PATH_VIEWBOX_HEIGHT,
  SHAPE_PATH_VIEWBOX_WIDTH,
} from "../block/property-keys";

const { fillSpy } = vi.hoisted(() => ({ fillSpy: vi.fn() }));
vi.mock("./konva-fill", () => ({ applyShapeFillStroke: fillSpy }));

import { updatePathNode } from "./konva-path-node";

interface FakePath {
  node: Konva.Path;
  getData: () => string;
  getScale: () => { x: number; y: number };
  getAttr: (k: string) => unknown;
  getSelfRect: () => { x: number; y: number; width: number; height: number };
}

function makeFakePath(): FakePath {
  const attrs = new Map<string, unknown>();
  let data = "";
  let scale = { x: 1, y: 1 };
  const node = {
    data: (v?: string) => {
      if (v !== undefined) data = v;
      return data;
    },
    scale: (v?: { x: number; y: number }) => {
      if (v !== undefined) scale = v;
      return scale;
    },
    setAttr: (k: string, v: unknown) => attrs.set(k, v),
    getAttr: (k: string) => attrs.get(k),
    getSelfRect: () => ({ x: 0, y: 0, width: 0, height: 0 }),
  } as unknown as Konva.Path;
  return {
    node,
    getData: () => data,
    getScale: () => scale,
    getAttr: (k) => attrs.get(k),
    getSelfRect: () => node.getSelfRect(),
  };
}

function makeShapeBlock(opts: {
  data: string;
  vbW: number;
  vbH: number;
  preserveAspect: boolean;
}): { graphic: BlockData; resolve: (id: number) => BlockData | undefined } {
  const shape: BlockData = {
    id: 2,
    type: "shape",
    kind: "path",
    name: "shape-path-2",
    parentId: 1,
    children: [],
    effectIds: [],
    shapeId: null,
    fillId: null,
    properties: {
      [SHAPE_PATH_DATA]: opts.data,
      [SHAPE_PATH_VIEWBOX_WIDTH]: opts.vbW,
      [SHAPE_PATH_VIEWBOX_HEIGHT]: opts.vbH,
      [SHAPE_PATH_PRESERVE_ASPECT]: opts.preserveAspect,
    },
  };
  const graphic: BlockData = {
    id: 1,
    type: "graphic",
    kind: "path",
    name: "graphic-1",
    parentId: null,
    children: [],
    effectIds: [],
    shapeId: 2,
    fillId: 3,
    properties: {},
  };
  const map = new Map<number, BlockData>([
    [1, graphic],
    [2, shape],
  ]);
  return { graphic, resolve: (id) => map.get(id) };
}

describe("updatePathNode", () => {
  it("sets the path data from the shape sub-block", () => {
    const { node, getData } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L10 10 Z",
      vbW: 10,
      vbH: 10,
      preserveAspect: false,
    });
    updatePathNode(node, graphic.properties, 100, 100, graphic, resolve);
    expect(getData()).toBe("M0 0 L10 10 Z");
  });

  it("non-uniform scale fills the block when preserveAspect = false", () => {
    const { node, getScale } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L10 10",
      vbW: 10,
      vbH: 10,
      preserveAspect: false,
    });
    updatePathNode(node, graphic.properties, 200, 100, graphic, resolve);
    expect(getScale()).toEqual({ x: 20, y: 10 });
  });

  it("uniform min-scale letterboxes the path when preserveAspect = true", () => {
    const { node, getScale } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L10 10",
      vbW: 10,
      vbH: 10,
      preserveAspect: true,
    });
    updatePathNode(node, graphic.properties, 200, 100, graphic, resolve);
    expect(getScale()).toEqual({ x: 10, y: 10 });
  });

  it("selection bounds + block attrs run in local viewBox space (top-left)", () => {
    const { node, getAttr, getSelfRect } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L10 10",
      vbW: 40,
      vbH: 20,
      preserveAspect: false,
    });
    updatePathNode(node, graphic.properties, 200, 100, graphic, resolve);
    expect(getSelfRect()).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(getAttr("blockWidth")).toBe(40);
    expect(getAttr("blockHeight")).toBe(20);
  });

  it("guards a zero/degenerate viewBox without dividing by zero", () => {
    const { node, getScale } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L1 1",
      vbW: 0,
      vbH: 0,
      preserveAspect: false,
    });
    updatePathNode(node, graphic.properties, 50, 50, graphic, resolve);
    expect(Number.isFinite(getScale().x)).toBe(true);
    expect(Number.isFinite(getScale().y)).toBe(true);
  });

  it("reuses the konva-fill FillBox seam with local top-left viewBox extents", () => {
    fillSpy.mockClear();
    const { node } = makeFakePath();
    const { graphic, resolve } = makeShapeBlock({
      data: "M0 0 L10 10 Z",
      vbW: 40,
      vbH: 20,
      preserveAspect: false,
    });
    updatePathNode(node, graphic.properties, 200, 100, graphic, resolve);
    expect(fillSpy).toHaveBeenCalledTimes(1);
    expect(fillSpy).toHaveBeenCalledWith(
      node,
      graphic.properties,
      { x: 0, y: 0, width: 40, height: 20 },
      graphic,
      resolve,
      null,
    );
  });
});
