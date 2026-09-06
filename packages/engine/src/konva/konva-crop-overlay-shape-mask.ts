import Konva from "konva";
import type { CropRect } from "../utils/crop-math";

export class KonvaCropOverlayShapeMask {
  #maskGroup = new Konva.Group({
    listening: false,
    name: "crop-shape-mask",
    visible: false,
  });
  #shade = new Konva.Rect({ fill: "rgba(0, 0, 0, 0.5)", listening: false });
  #cutout: Konva.Shape | null = null;
  #outline: Konva.Shape | null = null;
  #shapeRect: CropRect | null = null;
  #accentColor = "#2563eb";

  constructor(private readonly visualGroup: Konva.Group) {
    this.#maskGroup.add(this.#shade);
    visualGroup.add(this.#maskGroup);
    this.#maskGroup.zIndex(4);
  }

  sync(node: Konva.Shape, cropRect: CropRect): void {
    this.#cutout?.destroy();
    this.#outline?.destroy();
    this.#shapeRect = node.getSelfRect();
    this.#cutout = this.#cloneShape(node);
    this.#cutout.name("crop-shape-mask-cutout");
    this.#cutout.fill("#000000");
    this.#cutout.fillPriority("color");
    this.#cutout.strokeEnabled(false);
    this.#cutout.globalCompositeOperation("destination-out");
    this.#outline = this.#cloneShape(node);
    this.#outline.name("crop-shape-mask-outline");
    this.#outline.fillEnabled(false);
    this.#outline.stroke(this.#accentColor);
    this.#outline.strokeWidth(2);
    this.#outline.strokeScaleEnabled(false);
    this.#maskGroup.add(this.#cutout);
    this.visualGroup.add(this.#outline);
    this.#outline.zIndex(5);
    this.#maskGroup.visible(true);
    this.layout(cropRect);
  }

  layout(cropRect: CropRect): void {
    const shapeRect = this.#shapeRect;
    if (!shapeRect) return;
    const position = { x: cropRect.x - shapeRect.x, y: cropRect.y - shapeRect.y };
    this.#maskGroup.position(position);
    this.#outline?.position(position);
    this.#shade.setAttrs(shapeRect);
    this.#recache();
  }

  hide(): void {
    this.#maskGroup.clearCache();
    this.#maskGroup.visible(false);
    this.#cutout?.destroy();
    this.#outline?.destroy();
    this.#cutout = null;
    this.#outline = null;
    this.#shapeRect = null;
  }

  setAccentColor(color: string): void {
    this.#accentColor = color;
    this.#outline?.stroke(color);
  }

  containsPoint(point: { x: number; y: number }): boolean {
    const cutout = this.#cutout;
    if (!cutout) return false;
    const groupListening = this.#maskGroup.listening();
    const cutoutListening = cutout.listening();
    const compositeOperation = cutout.globalCompositeOperation();
    this.#maskGroup.listening(true);
    cutout.listening(true);
    cutout.globalCompositeOperation("source-over");
    try {
      return cutout.intersects(point);
    } finally {
      cutout.globalCompositeOperation(compositeOperation);
      cutout.listening(cutoutListening);
      this.#maskGroup.listening(groupListening);
    }
  }

  #cloneShape(node: Konva.Shape): Konva.Shape {
    const clone = node.clone() as Konva.Shape;
    clone.off();
    clone.setAttrs({
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
      opacity: 1,
      visible: true,
      listening: false,
      draggable: false,
      shadowEnabled: false,
    });
    return clone;
  }

  #recache(): void {
    const rect = this.#shapeRect;
    if (!rect || typeof document === "undefined") return;
    this.#maskGroup.clearCache();
    this.#maskGroup.cache(rect);
  }
}
