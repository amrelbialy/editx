import Konva from "konva";
import type { CropRect } from "../utils/crop-math";

/**
 * Manages the crop overlay UI on the Konva stage:
 *  - Semi-transparent dark background with a live cutout hole
 *  - Bright cutout rect (draggable/resizable)
 *  - Konva.Transformer with configurable anchors/ratio lock
 *  - Rule-of-thirds grid lines inside the crop area
 *
 * The dark overlay updates in real-time during drag and transform,
 * matching img.ly's crop UX.
 */
export class KonvaCropOverlay {
  #layer: Konva.Layer;
  #group: Konva.Group;
  /** 4 dark rects: top, bottom, left, right — arranged around the cutout */
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

    // Cutout rect — the bright area the user drags/resizes.
    // hitFunc ensures the full interior is draggable (not just the stroke).
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

    // Rule-of-thirds grid lines inside the crop area
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

    // Crop transformer — no rotation, constrained to image bounds
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
      // Constrain transform within image bounds
      boundBoxFunc: (oldBox, newBox) => {
        const imgX = this.#imageRect.x;
        const imgY = this.#imageRect.y;
        const imgRight = imgX + this.#imageRect.width;
        const imgBottom = imgY + this.#imageRect.height;

        const minSize = 10;
        if (newBox.width < minSize || newBox.height < minSize) {
          return oldBox;
        }

        // Ratio-locked: clamp proportionally so both dimensions scale together
        if (this.#ratio !== null) {
          let { x, y, width, height } = newBox;

          if (x < imgX) {
            width -= imgX - x;
            x = imgX;
            height = width / this.#ratio;
          }
          if (y < imgY) {
            height -= imgY - y;
            y = imgY;
            width = height * this.#ratio;
          }
          if (x + width > imgRight) {
            width = imgRight - x;
            height = width / this.#ratio;
          }
          if (y + height > imgBottom) {
            height = imgBottom - y;
            width = height * this.#ratio;
          }

          if (width < minSize || height < minSize) return oldBox;
          return { ...newBox, x, y, width, height };
        }

        // Free mode: clamp independently
        if (newBox.x < imgX) {
          newBox.width -= imgX - newBox.x;
          newBox.x = imgX;
        }
        if (newBox.y < imgY) {
          newBox.height -= imgY - newBox.y;
          newBox.y = imgY;
        }
        if (newBox.x + newBox.width > imgRight) {
          newBox.width = imgRight - newBox.x;
        }
        if (newBox.y + newBox.height > imgBottom) {
          newBox.height = imgBottom - newBox.y;
        }

        return newBox;
      },
    });

    // Wire up events on the CUTOUT node — Konva fires transform/transformend
    // on the target node being transformed, not on the Transformer itself.
    this.#cutout.on("dragmove", () => this.#onDragMove());
    this.#cutout.on("dragend", () => this.#onDragEnd());
    this.#cutout.on("transform", () => this.#onTransform());
    this.#cutout.on("transformend", () => this.#onTransformEnd());

    this.#group.add(this.#darkTop);
    this.#group.add(this.#darkBottom);
    this.#group.add(this.#darkLeft);
    this.#group.add(this.#darkRight);
    this.#group.add(this.#cutout);
    this.#group.add(this.#gridLines);
    this.#group.add(this.#transformer);

    this.#layer.add(this.#group);
  }

  /** Show the crop overlay for a given image rect, optionally with an initial crop. */
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

  /** Programmatically set the crop rect (e.g. when applying a preset). */
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

  /** Set or clear the aspect ratio lock. */
  setRatio(ratio: number | null): void {
    this.#ratio = ratio;
    this.#applyRatioConfig();
    this.#layer.batchDraw();
  }

  /** Get the current crop rect in image coordinates. */
  getCropRect(): CropRect {
    return {
      x: this.#cutout.x(),
      y: this.#cutout.y(),
      width: this.#cutout.width() * this.#cutout.scaleX(),
      height: this.#cutout.height() * this.#cutout.scaleY(),
    };
  }

  /** Get the image rect the crop overlay is constraining to. */
  getImageRect(): CropRect {
    return { ...this.#imageRect };
  }

  /** Whether the overlay is currently visible. */
  isVisible(): boolean {
    return this.#group.visible();
  }

  /** Clean up nodes. */
  destroy(): void {
    this.#cutout.off("dragmove dragend transform transformend");
    this.#group.destroy();
  }

  // ── Private ───────────────────────────────────────

  /** Get the current cutout rect accounting for transformer scale. */
  #getCutoutRect(): CropRect {
    return {
      x: this.#cutout.x(),
      y: this.#cutout.y(),
      width: this.#cutout.width() * this.#cutout.scaleX(),
      height: this.#cutout.height() * this.#cutout.scaleY(),
    };
  }

  /**
   * Reposition the 4 dark rects around the current cutout.
   *
   *  ┌─────────────────────────────┐
   *  │         darkTop             │
   *  ├──────┬──────────────┬───────┤
   *  │darkL │   cutout     │darkR  │
   *  ├──────┴──────────────┴───────┤
   *  │        darkBottom           │
   *  └─────────────────────────────┘
   */
  #updateDarkRects(): void {
    const img = this.#imageRect;
    const c = this.#getCutoutRect();

    // Top: full width, from image top to cutout top
    this.#darkTop.setAttrs({
      x: img.x,
      y: img.y,
      width: img.width,
      height: Math.max(0, c.y - img.y),
    });

    // Bottom: full width, from cutout bottom to image bottom
    const cutBottom = c.y + c.height;
    this.#darkBottom.setAttrs({
      x: img.x,
      y: cutBottom,
      width: img.width,
      height: Math.max(0, img.y + img.height - cutBottom),
    });

    // Left: from cutout top to cutout bottom, image left to cutout left
    this.#darkLeft.setAttrs({
      x: img.x,
      y: c.y,
      width: Math.max(0, c.x - img.x),
      height: c.height,
    });

    // Right: from cutout top to cutout bottom, cutout right to image right
    const cutRight = c.x + c.width;
    this.#darkRight.setAttrs({
      x: cutRight,
      y: c.y,
      width: Math.max(0, img.x + img.width - cutRight),
      height: c.height,
    });
  }

  /** Update rule-of-thirds grid lines inside the crop rect. */
  #updateGridLines(): void {
    const r = this.#getCutoutRect();
    const lines = this.#gridLines.children as unknown as Konva.Line[];
    if (!lines || lines.length < 4) return;

    const thirdW = r.width / 3;
    const thirdH = r.height / 3;

    // Vertical lines
    lines[0].points([r.x + thirdW, r.y, r.x + thirdW, r.y + r.height]);
    lines[1].points([r.x + thirdW * 2, r.y, r.x + thirdW * 2, r.y + r.height]);
    // Horizontal lines
    lines[2].points([r.x, r.y + thirdH, r.x + r.width, r.y + thirdH]);
    lines[3].points([r.x, r.y + thirdH * 2, r.x + r.width, r.y + thirdH * 2]);
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

  /** Live update during drag — clamp + redraw overlay and grid. */
  #onDragMove(): void {
    const x = this.#cutout.x();
    const y = this.#cutout.y();
    const w = this.#cutout.width() * this.#cutout.scaleX();
    const h = this.#cutout.height() * this.#cutout.scaleY();

    const clampedX = Math.max(
      this.#imageRect.x,
      Math.min(x, this.#imageRect.x + this.#imageRect.width - w),
    );
    const clampedY = Math.max(
      this.#imageRect.y,
      Math.min(y, this.#imageRect.y + this.#imageRect.height - h),
    );

    if (x !== clampedX || y !== clampedY) {
      this.#cutout.setAttrs({ x: clampedX, y: clampedY });
    }

    this.#updateDarkRects();
    this.#updateGridLines();
    this.#onLiveUpdate?.(this.getCropRect());
  }

  #onDragEnd(): void {
    this.#onDragMove();
    this.#emitChange();
  }

  /** Live update during transform — redraw dark rects and grid. */
  #onTransform(): void {
    this.#updateDarkRects();
    this.#updateGridLines();
  }

  #onTransformEnd(): void {
    // Normalize scale back to width/height
    const scaleX = this.#cutout.scaleX();
    const scaleY = this.#cutout.scaleY();

    const newWidth = this.#cutout.width() * scaleX;
    const newHeight = this.#cutout.height() * scaleY;
    const newX = this.#cutout.x();
    const newY = this.#cutout.y();

    // Clamp to image bounds
    const clampedX = Math.max(
      this.#imageRect.x,
      Math.min(newX, this.#imageRect.x + this.#imageRect.width - newWidth),
    );
    const clampedY = Math.max(
      this.#imageRect.y,
      Math.min(newY, this.#imageRect.y + this.#imageRect.height - newHeight),
    );
    let clampedW = Math.min(newWidth, this.#imageRect.x + this.#imageRect.width - clampedX);
    let clampedH = Math.min(newHeight, this.#imageRect.y + this.#imageRect.height - clampedY);

    // Enforce aspect ratio after clamping (safety net for floating-point drift)
    if (this.#ratio !== null) {
      const currentRatio = clampedW / clampedH;
      if (currentRatio > this.#ratio) {
        clampedW = clampedH * this.#ratio;
      } else if (currentRatio < this.#ratio) {
        clampedH = clampedW / this.#ratio;
      }
    }

    this.#cutout.setAttrs({
      x: clampedX,
      y: clampedY,
      width: clampedW,
      height: clampedH,
      scaleX: 1,
      scaleY: 1,
    });

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
