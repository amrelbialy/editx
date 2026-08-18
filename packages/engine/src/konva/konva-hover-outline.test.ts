import Konva from "konva";
import { beforeEach, describe, expect, it } from "vitest";
import type { KonvaCamera } from "./konva-camera";
import { KonvaHoverOutline } from "./konva-hover-outline";

describe("KonvaHoverOutline", () => {
  let contentLayer: Konva.Layer;
  let uiLayer: Konva.Layer;
  let transformer: Konva.Transformer;
  let context: number[];
  let enabled: boolean;
  let outline: KonvaHoverOutline;

  beforeEach(() => {
    contentLayer = new Konva.Group({
      x: 70,
      y: -30,
      scaleX: 1.75,
      scaleY: 1.75,
    }) as unknown as Konva.Layer;
    uiLayer = new Konva.Group({
      x: 70,
      y: -30,
      scaleX: 1.75,
      scaleY: 1.75,
    }) as unknown as Konva.Layer;
    uiLayer.batchDraw = () => uiLayer;
    transformer = new Konva.Transformer();
    uiLayer.add(transformer);
    context = [];
    enabled = true;
    outline = new KonvaHoverOutline(
      uiLayer,
      contentLayer,
      transformer,
      { getZoom: () => 1.75 } as KonvaCamera,
      () => context,
      "#4971FF",
      () => enabled,
    );
  });

  function addTree() {
    const outer = new Konva.Group({ x: 120, y: 80, rotation: 25 });
    outer.setAttrs({ blockId: 1, isGroup: true });
    const nested = new Konva.Group({ x: 35, y: 20, rotation: -10 });
    nested.setAttrs({ blockId: 2, isGroup: true });
    const child = new Konva.Path({
      x: 14,
      y: 9,
      data: "M -10 -5 L 10 -5 L 10 5 L -10 5 Z",
      scaleX: 2,
      scaleY: 3,
    });
    child.setAttr("blockId", 3);
    contentLayer.add(outer);
    outer.add(nested);
    nested.add(child);
    outline.bind(outer);
    outline.bind(nested);
    outline.bind(child);
    return { outer, nested, child };
  }

  function hoverRect(): Konva.Rect {
    return uiLayer.find("Rect").find((node) => node.listening() === false) as Konva.Rect;
  }

  function expectOutlineToMatch(node: Konva.Node): void {
    const expected = node.getClientRect({ relativeTo: contentLayer });
    expect(hoverRect().getAttrs()).toMatchObject({ ...expected, rotation: 0, visible: true });
    expect(hoverRect().getClientRect({ skipStroke: true })).toEqual(
      expect.objectContaining({
        x: expect.closeTo(node.getClientRect().x, 6),
        y: expect.closeTo(node.getClientRect().y, 6),
        width: expect.closeTo(node.getClientRect().width, 6),
        height: expect.closeTo(node.getClientRect().height, 6),
      }),
    );
  }

  it("outlines the outer group at top level and the direct child in an entered group", () => {
    const { outer, nested, child } = addTree();

    child.fire("mouseenter", { target: child }, false);
    expectOutlineToMatch(outer);

    context = [1];
    child.fire("mouseenter", { target: child }, false);
    expectOutlineToMatch(nested);
  });

  it("uses content-layer bounds through nested rotation, path scaling, zoom, and pan", () => {
    const { child } = addTree();
    context = [1, 2];

    child.fire("mouseenter", { target: child }, false);

    expectOutlineToMatch(child);
  });

  it("suppresses the outline when the resolved node is selected", () => {
    const { outer, child } = addTree();
    transformer.nodes([outer]);

    child.fire("mouseenter", { target: child }, false);

    expect(hoverRect().visible()).toBe(false);
  });

  it("suppresses the outline while normal interactions are disabled", () => {
    const { child } = addTree();
    enabled = false;

    child.fire("mouseenter", { target: child }, false);

    expect(hoverRect().visible()).toBe(false);
  });
});
