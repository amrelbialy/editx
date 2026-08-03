import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { applyCropStrokeScale, type CropStrokeNodes } from "./konva-crop-overlay-viewport";
import { layerInvScale } from "./konva-transformer-scale";
import { createStyledTransformer } from "./konva-transformer-style";

/**
 * WI-2: handles, strokes and grid lines must stay a constant on-screen size as
 * the world zoom changes. All the extracted sizing helpers achieve this by
 * multiplying their base pixel size by `1/zoom`; these tests pin that factor.
 */

/** A settable numeric attribute mimicking Konva's getter/setter accessor. */
function sizeAttr(initial = 0) {
  let value = initial;
  return (next?: number) => {
    if (next !== undefined) value = next;
    return value;
  };
}

describe("layerInvScale", () => {
  it("returns 1/scale of the node's layer", () => {
    const node = {
      getLayer: () => ({ scaleX: () => 2 }),
    } as unknown as Konva.Node;
    expect(layerInvScale(node)).toBe(0.5);
  });

  it("falls back to 1 when the node has no layer", () => {
    const node = { getLayer: () => null } as unknown as Konva.Node;
    expect(layerInvScale(node)).toBe(1);
  });

  it("falls back to 1 when the layer scale is 0", () => {
    const node = {
      getLayer: () => ({ scaleX: () => 0 }),
    } as unknown as Konva.Node;
    expect(layerInvScale(node)).toBe(1);
  });
});

describe("applyCropStrokeScale", () => {
  function makeNodes(): CropStrokeNodes & {
    cutout: { strokeWidth: ReturnType<typeof sizeAttr> };
  } {
    const cutout = { strokeWidth: sizeAttr(2) };
    const gridLines = [{ strokeWidth: sizeAttr(1) }, { strokeWidth: sizeAttr(1) }];
    const transformer = {
      anchorSize: sizeAttr(12),
      anchorCornerRadius: sizeAttr(6),
      anchorStrokeWidth: sizeAttr(2),
      borderStrokeWidth: sizeAttr(2),
    };
    return {
      cutout,
      gridLines,
      transformer,
    } as unknown as CropStrokeNodes & { cutout: { strokeWidth: ReturnType<typeof sizeAttr> } };
  }

  it("counter-scales every stroke/handle size by 1/zoom", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(2, nodes);

    const t = nodes.transformer as unknown as Record<string, () => number>;
    expect((nodes.cutout as unknown as { strokeWidth: () => number }).strokeWidth()).toBe(1);
    for (const line of nodes.gridLines as unknown as { strokeWidth: () => number }[]) {
      expect(line.strokeWidth()).toBe(0.5);
    }
    expect(t.anchorSize()).toBe(6);
    expect(t.anchorCornerRadius()).toBe(3);
    expect(t.anchorStrokeWidth()).toBe(1);
    expect(t.borderStrokeWidth()).toBe(1);
  });

  it("leaves sizes at their base values at zoom 1", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(1, nodes);
    const t = nodes.transformer as unknown as Record<string, () => number>;
    expect(t.anchorSize()).toBe(12);
    expect(t.borderStrokeWidth()).toBe(2);
  });

  it("treats a zoom of 0 as 1 (avoids divide-by-zero)", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(0, nodes);
    const t = nodes.transformer as unknown as Record<string, () => number>;
    expect(t.anchorSize()).toBe(12);
  });
});

describe("createStyledTransformer.updateViewportScale", () => {
  it("scales border/anchor stroke and rotate offset by 1/zoom", () => {
    const uiLayer = { batchDraw: vi.fn() } as unknown as Konva.Layer;
    const { transformer, updateViewportScale } = createStyledTransformer(uiLayer);

    updateViewportScale(2);
    expect(transformer.borderStrokeWidth()).toBe(1);
    expect(transformer.anchorStrokeWidth()).toBe(1);
    expect(transformer.rotateAnchorOffset()).toBe(15);

    updateViewportScale(0.5);
    expect(transformer.borderStrokeWidth()).toBe(4);
    expect(transformer.anchorStrokeWidth()).toBe(4);
    expect(transformer.rotateAnchorOffset()).toBe(60);
  });

  it("restores base sizes at zoom 1 and batch-draws the UI layer", () => {
    const batchDraw = vi.fn();
    const uiLayer = { batchDraw } as unknown as Konva.Layer;
    const { transformer, updateViewportScale } = createStyledTransformer(uiLayer);

    updateViewportScale(1);
    expect(transformer.borderStrokeWidth()).toBe(2);
    expect(transformer.rotateAnchorOffset()).toBe(30);
    expect(batchDraw).toHaveBeenCalled();
  });
});
