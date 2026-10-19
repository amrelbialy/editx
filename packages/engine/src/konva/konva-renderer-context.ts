import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import type { ImageFillCrop } from "../editor-types";
import type { BlockClickEvent, BlockTransform } from "../render-adapter";
import type { CropRect } from "../utils/crop-math";
import type { KonvaCamera } from "./konva-camera";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import type { KonvaHoverOutline } from "./konva-hover-outline";
import type { KonvaImageFillCrop } from "./konva-image-fill-crop";
import type { KonvaNodeFactory } from "./konva-node-factory";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export interface KonvaRendererCallbacks {
  onBlockClick?: (blockId: number, event: BlockClickEvent) => void;
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  onEnterGroup?: (groupId: number, childId: number | null) => void;
  onBlockDragEnd?: (blockId: number, x: number, y: number) => void;
  onBlockTransformEnd?: (blockId: number, transform: BlockTransform, anchorName?: string) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onCropChange?: (rect: CropRect) => void;
  onImageFillCropPreviewChange?: (crop: ImageFillCrop) => void;
  onImageFillCropDismiss?: () => void;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: { x: number; y: number }) => void;
  onBlockTransform?: (blockId: number, phase: "drag" | "resize") => void;
  onAutoSize?: (blockId: number, computedHeight: number) => void;
  onAutoWidth?: (blockId: number, computedWidth: number) => void;
  resolveBlock?: (id: number) => BlockData | undefined;
}

export class KonvaRendererContext {
  stage!: Konva.Stage;
  rootEl!: HTMLElement;
  contentLayer!: Konva.Layer;
  uiLayer!: Konva.Layer;
  transformer!: Konva.Transformer & { _bindHoverEvents?: () => void };
  selectionRect!: Konva.Rect;
  camera!: KonvaCamera;
  nodeFactory!: KonvaNodeFactory;
  cropOverlay!: KonvaCropOverlay;
  hoverOutline!: KonvaHoverOutline;
  imageFillCrop!: KonvaImageFillCrop;
  groupOutline!: Konva.Rect;

  readonly nodeMap = new Map<number, Konva.Node>();
  resizeObserver?: ResizeObserver;
  lastPageSize?: { width: number; height: number };
  webgl: WebGLFilterRenderer | null = null;
  updateAccentColor?: (color: string) => void;
  groupContext: number[] = [];

  constructor(readonly callbacks: KonvaRendererCallbacks) {}

  getCropFitRect(): CropRect | null {
    if (!this.cropOverlay?.isVisible() || this.cropOverlay.isBlockMode()) return null;
    return this.cropOverlay.getCropRect() ?? this.cropOverlay.getImageRect();
  }
}
