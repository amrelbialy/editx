import type Konva from "konva";
import { describe, expect, it } from "vitest";
import { applyCropStrokeScale, type CropStrokeNodes } from "./konva-crop-overlay-viewport";

/**
 * WI-2: overlay chrome must stay a constant on-screen size as the world zoom
 * changes.
 *
 * A `Konva.Transformer` neutralizes the layer zoom internally (it re-fits on
 * each node's `absoluteTransformChange`), so transformer handles/borders are
 * already screen-constant at their base sizes and must NOT be counter-scaled —
 * doing so double-counts and balloons the handles at low zoom.
 *
 * Only the plain overlay shapes that live directly on the zoom-scaled uiLayer
 * (the crop cutout stroke and grid lines) need manual `1/zoom` compensation.
 */

/** A settable numeric attribute mimicking Konva's getter/setter accessor. */
function sizeAttr(initial = 0) {
  let value = initial;
  return (next?: number) => {
    if (next !== undefined) value = next;
    return value;
  };
}

describe("applyCropStrokeScale", () => {
  function makeNodes() {
    const cutout = { strokeWidth: sizeAttr(2) };
    const gridLines = [{ strokeWidth: sizeAttr(1) }, { strokeWidth: sizeAttr(1) }];
    return { cutout, gridLines } as unknown as CropStrokeNodes & {
      cutout: { strokeWidth: () => number };
      gridLines: { strokeWidth: () => number }[];
    };
  }

  it("counter-scales the cutout stroke and grid lines by 1/zoom", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(2, nodes);

    expect(nodes.cutout.strokeWidth()).toBe(1);
    for (const line of nodes.gridLines) {
      expect(line.strokeWidth()).toBe(0.5);
    }
  });

  it("leaves strokes at their base values at zoom 1", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(1, nodes);

    expect(nodes.cutout.strokeWidth()).toBe(2);
    for (const line of nodes.gridLines) {
      expect(line.strokeWidth()).toBe(1);
    }
  });

  it("treats a zoom of 0 as 1 (avoids divide-by-zero)", () => {
    const nodes = makeNodes();
    applyCropStrokeScale(0, nodes);

    expect(nodes.cutout.strokeWidth()).toBe(2);
  });
});

describe("createStyledTransformer", () => {
  it("does not expose a zoom-compensation API (Konva keeps handles constant)", async () => {
    const { createStyledTransformer } = await import("./konva-transformer-style");
    const uiLayer = { batchDraw: () => {} } as unknown as Konva.Layer;
    const result = createStyledTransformer(uiLayer);

    expect(result).not.toHaveProperty("updateViewportScale");
    expect(typeof result.updateAccent).toBe("function");
  });
});
