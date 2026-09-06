import Konva from "konva";
import { describe, expect, it } from "vitest";
import { getNodeScreenTransform } from "./konva-block-screen-transform";

describe("getNodeScreenTransform", () => {
  it("includes translated and rotated ancestor groups", () => {
    const layer = new Konva.Group();
    const outer = new Konva.Group({ x: 100, y: 40, rotation: 90 });
    const inner = new Konva.Group({ x: 20, y: 10, rotation: -30 });
    const text = new Konva.Rect({ x: 5, y: 3, width: 80, height: 24, rotation: 15 });
    layer.add(outer);
    outer.add(inner);
    inner.add(text);

    const transform = getNodeScreenTransform(text);

    expect(transform.a).toBeCloseTo(Math.cos((75 * Math.PI) / 180));
    expect(transform.b).toBeCloseTo(Math.sin((75 * Math.PI) / 180));
    expect(transform.c).toBeCloseTo(-Math.sin((75 * Math.PI) / 180));
    expect(transform.d).toBeCloseTo(Math.cos((75 * Math.PI) / 180));
    expect(transform.e).toBeCloseTo(89.9019, 4);
    expect(transform.f).toBeCloseTo(65.8301, 4);
  });

  it("includes camera zoom and pan from the content layer", () => {
    const layer = new Konva.Group({ x: 12, y: -8, scaleX: 2, scaleY: 2 });
    const group = new Konva.Group({ x: 30, y: 20, rotation: 30 });
    const text = new Konva.Rect({ x: 10, y: 5, width: 80, height: 24 });
    layer.add(group);
    group.add(text);

    const transform = getNodeScreenTransform(text);

    expect(transform.a).toBeCloseTo(Math.sqrt(3));
    expect(transform.b).toBeCloseTo(1);
    expect(transform.c).toBeCloseTo(-1);
    expect(transform.d).toBeCloseTo(Math.sqrt(3));
    expect(transform.e).toBeCloseTo(84.3205, 4);
    expect(transform.f).toBeCloseTo(50.6603, 4);
  });
});
