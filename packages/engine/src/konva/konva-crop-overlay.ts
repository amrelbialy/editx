import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import {
  clampCutoutPosition,
  layoutDarkRects,
  layoutGridLines,
  normalizeCutoutTransform,
} from "./konva-crop-overlay-layout";
import {
  applyCropStrokeScale,
  CROP_ANCHORS_ALL,
  CROP_ANCHORS_CORNERS,
  createCropOverlayNodes,
  createCropTransformer,
  makeCropBoundBoxFunc,
} from "./konva-crop-overlay-viewport";

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
  #viewportZoom = 1;
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

    const nodes = createCropOverlayNodes();
    this.#group = nodes.group;
    this.#darkTop = nodes.darkTop;
    this.#darkBottom = nodes.darkBottom;
    this.#darkLeft = nodes.darkLeft;
    this.#darkRight = nodes.darkRight;
    this.#cutout = nodes.cutout;
    this.#gridLines = nodes.gridLines;

    this.#transformer = createCropTransformer(
      makeCropBoundBoxFunc(
        this.#layer,
        () => this.#imageRect,
        () => this.#ratio,
      ),
    );

    this.#cutout.on("dragmove", () => this.#onDragMove());
    this.#cutout.on("dragend", () => this.#onDragEnd());
    this.#cutout.on("transform", () => this.#onTransform());
    this.#cutout.on("transformend", () => this.#onTransformEnd());

    this.#group.add(this.#transformer);
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
    this.#applyRatioConfig();
    // Keep the plain overlay strokes screen-constant at the current zoom, then
    // let the transformer re-fit its (already screen-constant) handles.
    this.#applyStrokeScale();
    this.#transformer.forceUpdate();

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

  /** Counter-scale the plain overlay strokes (cutout + grid) by 1/zoom. */
  applyViewportScale(zoom: number): void {
    this.#viewportZoom = zoom || 1;
    this.#applyStrokeScale();
    this.#layer.batchDraw();
  }

  #applyStrokeScale(): void {
    applyCropStrokeScale(this.#effectiveZoom(), {
      cutout: this.#cutout,
      gridLines: this.#gridLines.children as unknown as Konva.Line[],
    });
  }

  /**
   * Source of truth for the counter-scale factor: the overlay lives on the
   * zoom-scaled uiLayer, so the layer's own scale *is* the current zoom. Reading
   * it directly avoids depending on {@link applyViewportScale} call ordering.
   */
  #effectiveZoom(): number {
    const layerScale = typeof this.#layer.scaleX === "function" ? this.#layer.scaleX() : 0;
    return layerScale || this.#viewportZoom || 1;
  }

  destroy(): void {
    this.#cutout.off("dragmove dragend transform transformend");
    this.#group.destroy();
  }

  #updateDarkRects(): void {
    layoutDarkRects(
      this.#imageRect,
      this.getCropRect(),
      this.#darkTop,
      this.#darkBottom,
      this.#darkLeft,
      this.#darkRight,
    );
  }

  #updateGridLines(): void {
    layoutGridLines(this.getCropRect(), this.#gridLines.children as unknown as Konva.Line[]);
  }

  #applyRatioConfig(): void {
    if (this.#ratio !== null) {
      this.#transformer.keepRatio(true);
      this.#transformer.enabledAnchors(CROP_ANCHORS_CORNERS);
    } else {
      this.#transformer.keepRatio(false);
      this.#transformer.enabledAnchors(CROP_ANCHORS_ALL);
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
