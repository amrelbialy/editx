import Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import { getBlockCropProxyFrame, setBlockCropProxyFrame } from "./konva-crop-overlay-block-frame";
import { KonvaCropOverlayShapeMask } from "./konva-crop-overlay-shape-mask";

export interface BlockCropOverlayGeometry {
  viewportRect: CropRect;
  cropRect: CropRect;
  transform: ReturnType<Konva.Transform["decompose"]>;
}

export interface BlockCropOverlayCallbacks {
  onChange: (frame: CropRect) => void;
  onStart?: () => void;
  onEnd?: () => void;
  getImagePolygon?: () => { x: number; y: number }[] | null;
}

export function getBlockCropOverlayGeometry(
  layer: Konva.Layer,
  node: Konva.Shape,
): BlockCropOverlayGeometry {
  const transform = layer
    .getAbsoluteTransform()
    .copy()
    .invert()
    .multiply(node.getAbsoluteTransform())
    .decompose();
  const cropRect = node.getSelfRect();
  const stage = layer.getStage();
  if (!stage) return { viewportRect: cropRect, cropRect, transform };

  const inverseNode = node.getAbsoluteTransform().copy().invert();
  const corners = [
    inverseNode.point({ x: 0, y: 0 }),
    inverseNode.point({ x: stage.width(), y: 0 }),
    inverseNode.point({ x: stage.width(), y: stage.height() }),
    inverseNode.point({ x: 0, y: stage.height() }),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    viewportRect: {
      x: left,
      y: top,
      width: Math.max(...xs) - left,
      height: Math.max(...ys) - top,
    },
    cropRect,
    transform,
  };
}

export class KonvaCropOverlayBlock {
  #node: Konva.Shape | null = null;
  #proxyParent = new Konva.Group({ listening: false, visible: false });
  #frameProxy = new Konva.Rect({
    fill: "transparent",
    listening: false,
    name: "crop-frame-proxy",
  });
  #transforming = false;
  #framePending = false;
  #callbacks?: BlockCropOverlayCallbacks;
  #imagePolygon: { x: number; y: number }[] | null = null;
  #shapeMask: KonvaCropOverlayShapeMask;

  constructor(
    private readonly layer: Konva.Layer,
    overlayGroup: Konva.Group,
    private readonly visualGroup: Konva.Group,
    private readonly cutout: Konva.Rect,
    private readonly gridLines: Konva.Group,
    private readonly transformer: Konva.Transformer,
    private readonly applyLayout: (viewportRect: CropRect, cropRect: CropRect) => void,
  ) {
    this.#shapeMask = new KonvaCropOverlayShapeMask(visualGroup);
    this.#proxyParent.add(this.#frameProxy);
    overlayGroup.add(this.#proxyParent);
    this.#frameProxy.on("transformstart.imageFillCropProxy", () => {
      this.#transforming = true;
      this.#imagePolygon = this.#calculateImagePolygon();
      this.#callbacks?.onStart?.();
    });
    this.#frameProxy.on("transform.imageFillCropProxy", () => {
      this.#refreshProxyVisual();
      this.#emitFrame();
    });
    this.#frameProxy.on("transformend.imageFillCropProxy", () => this.#finishTransform());
  }

  show(node: Konva.Shape, callbacks: BlockCropOverlayCallbacks): void {
    this.leave();
    this.#node = node;
    this.#framePending = false;
    this.#callbacks = callbacks;
    this.visualGroup.listening(false);
    this.cutout.draggable(false);
    this.cutout.strokeEnabled(false);
    this.#setStrokeScaling(false);
    this.#proxyParent.visible(true);
    this.refresh();
    this.transformer.nodes([this.#frameProxy]);
  }

  refresh(): void {
    if (!this.#node) return;
    if (this.#transforming || this.#framePending) this.#refreshProxyVisual();
    else {
      this.#applyVisualGeometry(this.#node);
      this.#syncProxy();
    }
    this.transformer.forceUpdate();
    this.layer.batchDraw();
  }

  leave(): void {
    this.#node = null;
    this.#callbacks = undefined;
    this.#transforming = false;
    this.#framePending = false;
    this.#imagePolygon = null;
    this.#proxyParent.visible(false);
    this.visualGroup.setAttrs({
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      offsetX: 0,
      offsetY: 0,
    });
    this.visualGroup.listening(true);
    this.cutout.draggable(true);
    this.cutout.strokeEnabled(true);
    this.#shapeMask.hide();
    this.#setStrokeScaling(true);
  }

  isActive = (): boolean => this.#node !== null;

  getImagePolygon(): { x: number; y: number }[] | null {
    return this.#transforming ? this.#imagePolygon : this.#calculateImagePolygon();
  }

  setAccentColor = (color: string): void => this.#shapeMask.setAccentColor(color);
  containsPoint = (point: { x: number; y: number }): boolean =>
    this.#shapeMask.containsPoint(point);

  setFrame(frame: CropRect): void {
    const node = this.#node;
    if (!node) return;
    setBlockCropProxyFrame(this.#frameProxy, node, frame);
    this.#framePending = true;
    this.#refreshProxyVisual();
    this.transformer.forceUpdate();
  }

  #calculateImagePolygon(): { x: number; y: number }[] | null {
    const supplied = this.#callbacks?.getImagePolygon?.();
    if (supplied) return supplied;
    const node = this.#node;
    const source = node?.fillPatternImage();
    if (!node || !source || node.getAttr("__fillPatternFit") === "tile") return null;
    const scale = node.fillPatternScale();
    const offset = node.fillPatternOffset();
    const pattern = new Konva.Transform();
    pattern.translate(node.fillPatternX(), node.fillPatternY());
    pattern.rotate((node.fillPatternRotation() * Math.PI) / 180);
    pattern.scale(scale.x, scale.y);
    pattern.translate(-offset.x, -offset.y);
    const absolute = node.getAbsoluteTransform().copy().multiply(pattern);
    return [
      absolute.point({ x: 0, y: 0 }),
      absolute.point({ x: source.width, y: 0 }),
      absolute.point({ x: source.width, y: source.height }),
      absolute.point({ x: 0, y: source.height }),
    ];
  }

  #syncProxy(): void {
    const node = this.#node;
    const parent = node?.getParent();
    if (!node || !parent) return;
    const parentTransform = this.layer
      .getAbsoluteTransform()
      .copy()
      .invert()
      .multiply(parent.getAbsoluteTransform())
      .decompose();
    const selfRect = node.getSelfRect();
    this.#proxyParent.setAttrs({ ...parentTransform, offsetX: 0, offsetY: 0 });
    this.#frameProxy.setAttrs({
      x: node.x(),
      y: node.y(),
      width: selfRect.width,
      height: selfRect.height,
      rotation: node.rotation(),
      offsetX: -selfRect.x,
      offsetY: -selfRect.y,
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  }

  #getFrame(): CropRect | null {
    const node = this.#node;
    if (!node) return null;
    return getBlockCropProxyFrame(this.#frameProxy, node);
  }

  #emitFrame(): void {
    const frame = this.#getFrame();
    if (frame) this.#callbacks?.onChange(frame);
  }

  #refreshProxyVisual(): void {
    this.#applyVisualGeometry(this.#frameProxy);
    this.#shapeMask.layout(this.#frameProxy.getSelfRect());
    this.layer.batchDraw();
  }

  #applyVisualGeometry(node: Konva.Shape): void {
    const { viewportRect, cropRect, transform } = getBlockCropOverlayGeometry(this.layer, node);
    this.visualGroup.setAttrs({ ...transform, offsetX: 0, offsetY: 0 });
    this.applyLayout(viewportRect, cropRect);
    if (node === this.#node) this.#shapeMask.sync(node, cropRect);
  }

  #finishTransform(): void {
    this.#emitFrame();
    this.#transforming = false;
    this.#framePending = true;
    this.#imagePolygon = null;
    this.#callbacks?.onEnd?.();
    this.refresh();
  }

  #setStrokeScaling(enabled: boolean): void {
    this.cutout.strokeScaleEnabled(enabled);
    for (const line of this.gridLines.children as unknown as Konva.Line[]) {
      line.strokeScaleEnabled(enabled);
    }
  }
}
