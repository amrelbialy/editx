import Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import {
  clampCutoutPosition,
  cropBoundBoxFunc,
  layoutDarkRects,
  layoutGridLines,
  normalizeCutoutTransform,
} from "./konva-crop-overlay-layout";

export class KonvaCropOverlay {
  #layer: Konva.Layer;
  #group: Konva.Group;
  #darkTop: Konva.Rect;
  #darkBottom: Konva.Rect;
  #darkLeft: Konva.Rect;
  #darkRight: Konva.Rect;
  #cutout: Konva.Rect;
  #gridLines: Konva.Group;
  #transformer: Konva.Transformer;

  #imageRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  #ratio: number | null = null;
  #onChange?: (rect: CropRect) => void;
  #onLiveUpdate?: (rect: CropRect) => void;

  constructor(
    layer: Konva.Layer,
    onChange?: (rect: CropRect) => void,
    onLiveUpdate?: (rect: CropRect) => void,
  ) {
    this.#layer = layer;
    this.#onChange = onChange;
    this.#onLiveUpdate = onLiveUpdate;

    this.#group = new Konva.Group({ name: "crop-overlay", visible: false });

    const darkFill = "rgba(0, 0, 0, 0.5)";
    this.#darkTop = new Konva.Rect({ fill: darkFill, listening: false });
    this.#darkBottom = new Konva.Rect({ fill: darkFill, listening: false });
    this.#darkLeft = new Konva.Rect({ fill: darkFill, listening: false });
    this.#darkRight = new Konva.Rect({ fill: darkFill, listening: false });

    this.#cutout = new Konva.Rect({
      fill: "transparent",
      stroke: "#ffffff",
      strokeWidth: 2,
      draggable: true,
      name: "crop-cutout",
      hitFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
    });

    this.#gridLines = new Konva.Group({ listening: false });
    for (let i = 0; i < 4; i++) {
      this.#gridLines.add(
        new Konva.Line({
          points: [0, 0, 0, 0],
          stroke: "rgba(255, 255, 255, 0.4)",
          strokeWidth: 1,
          listening: false,
        }),
      );
    }

    this.#transformer = new Konva.Transformer({
      rotateEnabled: false,
      flipEnabled: false,
      centeredScaling: false,
      anchorSize: 12,
      anchorCornerRadius: 6,
      anchorStroke: "#2563eb",
      anchorFill: "#ffffff",
      anchorStrokeWidth: 2,
      borderStroke: "#2563eb",
      borderStrokeWidth: 2,
      keepRatio: false,
      enabledAnchors: [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "top-center",
        "bottom-center",
      ],
      boundBoxFunc: (oldBox, newBox) =>
        cropBoundBoxFunc(this.#imageRect, this.#ratio, oldBox, newBox),
    });

    this.#cutout.on("dragmove", () => this.#onDragMove());
    this.#cutout.on("dragend", () => this.#onDragEnd());
    this.#cutout.on("transform", () => this.#onTransform());
    this.#cutout.on("transformend", () => this.#onTransformEnd());

    this.#group.add(this.#darkTop, this.#darkBottom, this.#darkLeft, this.#darkRight);
    this.#group.add(this.#cutout, this.#gridLines, this.#transformer);
    this.#layer.add(this.#group);
  }

  show(imageRect: CropRect, initialCrop?: CropRect): void {
    this.#imageRect = { ...imageRect };

    const crop = initialCrop && initialCrop.width > 0 ? { ...initialCrop } : { ...imageRect };

    this.#cutout.setAttrs({
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      scaleX: 1,
      scaleY: 1,
    });

    this.#updateDarkRects();
    this.#updateGridLines();
    this.#transformer.nodes([this.#cutout]);
    this.#transformer.forceUpdate();
    this.#applyRatioConfig();

    this.#group.visible(true);
    this.#group.moveToTop();
    this.#layer.batchDraw();
  }

  /** Hide the crop overlay. */
  hide(): void {
    this.#transformer.nodes([]);
    this.#group.visible(false);
    this.#layer.batchDraw();
  }

  setCropRect(rect: CropRect): void {
    this.#cutout.setAttrs({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      scaleX: 1,
      scaleY: 1,
    });
    this.#updateDarkRects();
    this.#updateGridLines();
    this.#transformer.nodes([this.#cutout]);
    this.#transformer.forceUpdate();
    this.#layer.batchDraw();
    this.#emitChange();
  }

  setRatio(ratio: number | null): void {
    this.#ratio = ratio;
    this.#applyRatioConfig();
    this.#layer.batchDraw();
  }

  getCropRect(): CropRect {
    return {
      x: this.#cutout.x(),
      y: this.#cutout.y(),
      width: this.#cutout.width() * this.#cutout.scaleX(),
      height: this.#cutout.height() * this.#cutout.scaleY(),
    };
  }

  getImageRect(): CropRect {
    return { ...this.#imageRect };
  }
  isVisible(): boolean {
    return this.#group.visible();
  }

  setAccentColor(color: string): void {
    this.#transformer.anchorStroke(color);
    this.#transformer.borderStroke(color);
    this.#layer.batchDraw();
  }

  destroy(): void {
    this.#cutout.off("dragmove dragend transform transformend");
    this.#group.destroy();
  }

  #getCutoutRect(): CropRect {
    return {
      x: this.#cutout.x(),
      y: this.#cutout.y(),
      width: this.#cutout.width() * this.#cutout.scaleX(),
      height: this.#cutout.height() * this.#cutout.scaleY(),
    };
  }

  #updateDarkRects(): void {
    layoutDarkRects(
      this.#imageRect,
      this.#getCutoutRect(),
      this.#darkTop,
      this.#darkBottom,
      this.#darkLeft,
      this.#darkRight,
    );
  }

  #updateGridLines(): void {
    layoutGridLines(this.#getCutoutRect(), this.#gridLines.children as unknown as Konva.Line[]);
  }

  #applyRatioConfig(): void {
    if (this.#ratio !== null) {
      this.#transformer.keepRatio(true);
      this.#transformer.enabledAnchors(["top-left", "top-right", "bottom-left", "bottom-right"]);
    } else {
      this.#transformer.keepRatio(false);
      this.#transformer.enabledAnchors([
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "top-center",
        "bottom-center",
      ]);
    }
  }

  #onDragMove(): void {
    const w = this.#cutout.width() * this.#cutout.scaleX();
    const h = this.#cutout.height() * this.#cutout.scaleY();
    const clamped = clampCutoutPosition(this.#cutout.x(), this.#cutout.y(), w, h, this.#imageRect);
    if (this.#cutout.x() !== clamped.x || this.#cutout.y() !== clamped.y) {
      this.#cutout.setAttrs(clamped);
    }
    this.#updateDarkRects();
    this.#updateGridLines();
    this.#onLiveUpdate?.(this.getCropRect());
  }

  #onDragEnd(): void {
    this.#onDragMove();
    this.#emitChange();
  }

  #onTransform(): void {
    this.#updateDarkRects();
    this.#updateGridLines();
  }

  #onTransformEnd(): void {
    const result = normalizeCutoutTransform(
      this.#cutout.x(),
      this.#cutout.y(),
      this.#cutout.width() * this.#cutout.scaleX(),
      this.#cutout.height() * this.#cutout.scaleY(),
      this.#imageRect,
      this.#ratio,
    );
    this.#cutout.setAttrs({ ...result, scaleX: 1, scaleY: 1 });
    this.#updateDarkRects();
    this.#updateGridLines();
    this.#onLiveUpdate?.(this.getCropRect());
    this.#transformer.forceUpdate();
    this.#layer.batchDraw();
    this.#emitChange();
  }

  #emitChange(): void {
    this.#onChange?.(this.getCropRect());
  }
}
