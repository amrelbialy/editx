import Konva from "konva";
import { constrainImageFillCrop, panImageFillCrop } from "../editor/image-fill-crop-math";
import type { ImageFillCrop } from "../editor-types";
import type { BlockTransform } from "../render-adapter";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import { applyImagePatternTransform } from "./konva-image-fill";
import { bindImageFillCropEvents } from "./konva-image-fill-crop-events";
import { resizeImageFillCropFrame } from "./konva-image-fill-crop-frame";
import {
  getImageFillCropGeometry,
  getImageFillCropLocalPointer,
} from "./konva-image-fill-crop-node";
import {
  createImageFillCropPreview,
  destroyImageFillCropPreview,
  getImageFillCropPreviewPolygon,
  type ImageFillCropPreview,
  syncImageFillCropPreviewPlane,
} from "./konva-image-fill-crop-preview";
import { resolveImageFillCropSet } from "./konva-image-fill-crop-update";

type PatternSource = HTMLImageElement | HTMLCanvasElement;
type CropFrame = Pick<ImageFillCrop, "x" | "y" | "width" | "height">;

interface ActiveCrop {
  blockId: number;
  preview: ImageFillCropPreview;
  node: Konva.Shape;
  value: ImageFillCrop;
  lastPoint: { x: number; y: number } | null;
  suppressNextClick: boolean;
  dismissed: boolean;
  frameGestureStart?: ImageFillCrop;
  pendingReady?: Promise<void>;
}

export class KonvaImageFillCrop {
  #active: ActiveCrop | null = null;

  constructor(
    private readonly stage: Konva.Stage,
    private readonly nodeMap: Map<number, Konva.Node>,
    private readonly cropOverlay: KonvaCropOverlay,
    private readonly onChange: (crop: ImageFillCrop) => void,
    private readonly applyFrame: (
      blockId: number,
      frame: CropFrame,
      preview: ImageFillCropPreview,
    ) => void,
    private readonly onDismiss?: () => void,
  ) {}

  show(blockId: number, crop: ImageFillCrop): ImageFillCrop | null {
    this.hide();
    const sourceNode = this.nodeMap.get(blockId);
    if (!(sourceNode instanceof Konva.Shape)) return null;
    const preview = createImageFillCropPreview(sourceNode);
    if (!preview) return null;
    const node = preview.node;
    const source = sourceNode.getAttr("__fillPatternSource") as PatternSource | undefined;
    const sourceValue =
      source?.width && source.height
        ? { ...crop, sourceAspectRatio: source.width / source.height }
        : crop;
    const value =
      source?.width && source.height
        ? constrainImageFillCrop(sourceValue, {
            boxWidth: crop.width,
            boxHeight: crop.height,
            imageWidth: source.width,
            imageHeight: source.height,
          })
        : sourceValue;
    this.#active = {
      blockId,
      preview,
      node,
      value,
      lastPoint: null,
      suppressNextClick: false,
      dismissed: false,
    };
    node.draggable(false);
    node.strokeScaleEnabled(false);
    bindImageFillCropEvents(node, {
      stage: this.stage,
      cropOverlay: this.cropOverlay,
      getActive: () => this.#active,
      move: () => this.#move(),
      dismiss: () => this.onDismiss?.(),
      setCursor: (cursor) => this.#setCursor(cursor),
    });
    this.cropOverlay.setRatio(null);
    this.cropOverlay.showBlock(node, {
      onStart: () => this.#startFrameGesture(),
      onChange: (frame) => this.#previewFrame(frame),
      onEnd: () => this.#endFrameGesture(),
      getImagePolygon: () => getImageFillCropPreviewPolygon(preview),
    });
    this.#apply();
    return { ...value };
  }

  set(crop: ImageFillCrop, ratio?: number | null): ImageFillCrop | null {
    const active = this.#active;
    if (!active) return null;
    const source = active.node.getAttr("__fillPatternSource") as PatternSource | undefined;
    const update = resolveImageFillCropSet(active.value, crop, source, active.node.rotation());
    active.value = update.value;
    if (ratio !== undefined) this.cropOverlay.setRatio(ratio);
    this.cropOverlay.setBlockFrame(active.value);
    if (update.applyPreview) this.#apply();
    return { ...active.value };
  }

  captureTransform(blockId: number, transform: BlockTransform): boolean {
    if (!this.#active || this.#active.blockId !== blockId) return false;
    this.#active.value = {
      ...this.#active.value,
      x: transform.x,
      y: transform.y,
      width: transform.width,
      height: transform.height,
    };
    this.cropOverlay.setBlockFrame(this.#active.value);
    this.#apply();
    this.cropOverlay.refreshBlock();
    this.onChange({ ...this.#active.value });
    return true;
  }

  reapply(blockId: number): void {
    const active = this.#active;
    if (!active || active.blockId !== blockId) return;
    const sourceNode = this.nodeMap.get(blockId);
    if (!(sourceNode instanceof Konva.Shape) || sourceNode !== active.preview.sourceNode) return;
    const source = sourceNode.getAttr("__fillPatternSource") as PatternSource | undefined;
    if (source?.width && source.height) {
      active.node.setAttr("__fillPatternSource", source);
      const sourceAspectRatio = source.width / source.height;
      if (active.value.sourceAspectRatio !== sourceAspectRatio) {
        active.value = { ...active.value, sourceAspectRatio };
        this.onChange({ ...active.value });
      }
    }
    this.#applyPattern();
  }

  isActive = (): boolean => this.#active !== null;

  hide(): void {
    const active = this.#active;
    if (!active) return;
    active.node.off(".imageFillCrop");
    this.stage.off(".imageFillCrop");
    this.cropOverlay.hide();
    destroyImageFillCropPreview(active.preview);
    this.#active = null;
    this.#setCursor("");
  }

  #apply(): void {
    const active = this.#active;
    if (!active) return;
    this.applyFrame(active.blockId, active.value, active.preview);
    this.#applyPattern();
    this.#reapplyWhenReady(active.node, active.blockId);
    this.cropOverlay.refreshBlock();
    active.node.getLayer()?.batchDraw();
  }

  #applyPattern(): void {
    const active = this.#active;
    if (!active) return;
    const source = active.node.getAttr("__fillPatternSource") as PatternSource | undefined;
    if (!source?.width || !source.height) return;
    const box = active.node.getSelfRect();
    applyImagePatternTransform(active.node, source, active.value.fit, box, active.value);
    syncImageFillCropPreviewPlane(active.preview);
    active.node.fillPatternRepeat(active.value.fit === "tile" ? "repeat" : "no-repeat");
  }

  #move(): void {
    const active = this.#active;
    if (!active?.lastPoint) return;
    const point = getImageFillCropLocalPointer(this.stage, active.node);
    const geometry = getImageFillCropGeometry(active.node);
    if (!point || !geometry) return;
    const delta = { x: point.x - active.lastPoint.x, y: point.y - active.lastPoint.y };
    active.lastPoint = point;
    if (delta.x !== 0 || delta.y !== 0) active.suppressNextClick = true;
    active.value = panImageFillCrop(
      active.value,
      { ...geometry, boxWidth: active.value.width, boxHeight: active.value.height },
      delta,
    );
    this.#applyPattern();
    active.node.getLayer()?.batchDraw();
    this.onChange({ ...active.value });
  }

  #previewFrame(frame: CropFrame): void {
    const active = this.#active;
    if (!active) return;
    const value = this.#resizeFrame(active.frameGestureStart ?? active.value, frame);
    active.value = value;
    if (value.fit === "tile") this.#apply();
    this.onChange({ ...value });
  }

  #resizeFrame(baseline: ImageFillCrop, frame: CropFrame): ImageFillCrop {
    const active = this.#active;
    const source = active?.node.getAttr("__fillPatternSource") as PatternSource | undefined;
    return active && source?.width && source.height
      ? resizeImageFillCropFrame(
          baseline,
          frame,
          { width: source.width, height: source.height },
          active.node.rotation(),
        )
      : { ...baseline, ...frame };
  }

  #startFrameGesture(): void {
    if (this.#active) this.#active.frameGestureStart = { ...this.#active.value };
  }

  #endFrameGesture(): void {
    if (this.#active) this.#active.frameGestureStart = undefined;
  }

  #reapplyWhenReady(node: Konva.Shape, blockId: number): void {
    const active = this.#active;
    const ready = active?.preview.sourceNode.getAttr("__fillImageReady") as
      | Promise<void>
      | undefined;
    if (!ready || !active || active.node !== node || active.pendingReady === ready) return;
    active.pendingReady = ready;
    void ready.then(() => this.reapply(blockId));
  }

  #setCursor(cursor: string): void {
    this.stage.container().style.cursor = cursor;
  }
}
