import {
  type EditxEngine,
  hexToColor,
  TEXT_ALIGN,
  TEXT_LINE_HEIGHT,
  type TextRunStyle,
} from "@editx/engine";

type Bounds = readonly [x: number, y: number, width: number, height: number];
type TextOptions = TextRunStyle & { align?: "left" | "center" | "right" };

export function createPostBuilder(engine: EditxEngine, pageId: number) {
  const shape = (
    name: string,
    kind: "rect" | "ellipse",
    bounds: Bounds,
    color: string,
    radius = 0,
  ) => {
    const id = engine.block.addShape(pageId, kind, "color", ...bounds);
    if (kind === "rect" && radius > 0) {
      engine.block.setShapeGeometry(id, { type: "rect", cornerRadius: radius });
    }
    engine.block.setFillSolidColor(id, hexToColor(color));
    engine.block.setName(id, name);
    return id;
  };

  return {
    rect: (name: string, bounds: Bounds, color: string, radius = 0) =>
      shape(name, "rect", bounds, color, radius),
    ellipse: (name: string, bounds: Bounds, color: string) => shape(name, "ellipse", bounds, color),
    text(
      name: string,
      content: string,
      bounds: Bounds,
      size: number,
      color: string,
      options: TextOptions = {},
    ) {
      const { align = "left", ...style } = options;
      const id = engine.block.addText(pageId, ...bounds, content, {
        style: { fontFamily: "Arial", fontSize: size, fill: color, ...style },
      });
      engine.block.setProperty(id, TEXT_ALIGN, align);
      engine.block.setProperty(id, TEXT_LINE_HEIGHT, 1.12);
      engine.block.setName(id, name);
      return id;
    },
    rotate(id: number, angle: number) {
      engine.block.setRotation(id, angle);
      return id;
    },
    group(name: string, ids: number[]) {
      const id = engine.block.group(ids);
      engine.block.setName(id, name);
      return id;
    },
  };
}

export type PostBuilder = ReturnType<typeof createPostBuilder>;
