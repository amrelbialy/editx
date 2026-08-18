import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import { type BlockCropOverlayCallbacks, KonvaCropOverlayBlock } from "./konva-crop-overlay-block";
import { bindCropOverlayEvents } from "./konva-crop-overlay-events";
import { layoutDarkRects, layoutGridLines } from "./konva-crop-overlay-layout";
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
  #visualGroup: Konva.Group;
  #darkTop: Konva.Rect;
  #darkBottom: Konva.Rect;
  #darkLeft: Konva.Rect;
  #darkRight: Konva.Rect;
  #cutout: Konva.Rect;
  #gridLines: Konva.Group;
  #transformer: Konva.Transformer;
  #block: KonvaCropOverlayBlock;
  #imageRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  #ratio: number | null = null;
  #viewportZoom = 1;
  #onChange?: (rect: CropRect) => void;
  #unbindEvents: () => void;

  constructor(
    layer: Konva.Layer,
    onChange?: (rect: CropRect) => void,
    onLiveUpdate?: (rect: CropRect) => void,
  ) {
    this.#layer = layer;
    this.#onChange = onChange;

    const nodes = createCropOverlayNodes();
    this.#group = nodes.group;
    this.#visualGroup = nodes.visualGroup;
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
        () => !this.#block?.isActive(),
        () => this.#block?.getImagePolygon() ?? null,
      ),
    );
    this.#block = new KonvaCropOverlayBlock(
      this.#layer,
      this.#group,
      this.#visualGroup,
      this.#cutout,
      this.#gridLines,
      this.#transformer,
      (viewportRect, cropRect) => {
        this.#imageRect = viewportRect;
        this.#cutout.setAttrs({ ...cropRect, scaleX: 1, scaleY: 1 });
        this.#updateDarkRects();
        this.#updateGridLines();
      },
    );

    this.#unbindEvents = bindCropOverlayEvents({
      cutout: this.#cutout,
      transformer: this.#transformer,
      layer: this.#layer,
      getImageRect: () => this.#imageRect,
      getRatio: () => this.#ratio,
      updateLayout: () => {
        this.#updateDarkRects();
        this.#updateGridLines();
      },
      onChange,
      onLiveUpdate,
    });

    this.#group.add(this.#transformer);
    this.#layer.add(this.#group);
  }

  show(imageRect: CropRect, initialCrop?: CropRect): void {
    this.#block.leave();
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
    this.#applyStrokeScale();
    this.#transformer.forceUpdate();

    this.#group.visible(true);
    this.#group.moveToTop();
    this.#layer.batchDraw();
  }

  showBlock(node: Konva.Shape, callbacks: BlockCropOverlayCallbacks): void {
    this.#block.show(node, callbacks);
    this.#applyRatioConfig();
    this.#applyStrokeScale();
    this.#transformer.forceUpdate();
    this.#group.visible(true);
    this.#group.moveToTop();
    this.#layer.batchDraw();
  }

  refreshBlock = (): void => this.#block.refresh();
  setBlockFrame = (frame: CropRect): void => this.#block.setFrame(frame);
  containsBlockPoint = (point: { x: number; y: number }): boolean =>
    this.#block.containsPoint(point);

  isBlockMode(): boolean {
    return this.#block.isActive();
  }

  hide(): void {
    this.#block.leave();
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
    this.#block.setAccentColor(color);
    this.#layer.batchDraw();
  }

  applyViewportScale(zoom: number): void {
    this.#viewportZoom = zoom || 1;
    this.#applyStrokeScale();
    this.#layer.batchDraw();
  }

  #applyStrokeScale(): void {
    applyCropStrokeScale(this.#block.isActive() ? 1 : this.#effectiveZoom(), {
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
    this.#block.leave();
    this.#unbindEvents();
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

  #emitChange(): void {
    this.#onChange?.(this.getCropRect());
  }
}
