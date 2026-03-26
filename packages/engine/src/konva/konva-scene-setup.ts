import Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import { KonvaCamera } from "./konva-camera";
import { KonvaCropOverlay } from "./konva-crop-overlay";
import { setupInteraction } from "./konva-interaction-handler";
import { KonvaNodeFactory } from "./konva-node-factory";
import { createStyledTransformer } from "./konva-transformer-style";
import { WebGLFilterRenderer } from "./webgl-filter-renderer";

export interface SceneComponents {
  stage: Konva.Stage;
  contentLayer: Konva.Layer;
  uiLayer: Konva.Layer;
  transformer: Konva.Transformer;
  selectionRect: Konva.Rect;
  camera: KonvaCamera;
  nodeFactory: KonvaNodeFactory;
  cropOverlay: KonvaCropOverlay;
  webgl: WebGLFilterRenderer | null;
}

export interface SceneCallbacks {
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onBlockDblClick?: (blockId: number) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  onCropChange?: (rect: CropRect) => void;
}

export function createKonvaScene(
  rootEl: HTMLElement,
  pageW: number,
  pageH: number,
  nodeMap: Map<number, Konva.Node>,
  callbacks: SceneCallbacks,
): SceneComponents {
  const stage = new Konva.Stage({
    container: rootEl as HTMLDivElement,
    width: rootEl.clientWidth,
    height: rootEl.clientHeight,
  });

  const contentLayer = new Konva.Layer();
  stage.add(contentLayer);

  const uiLayer = new Konva.Layer();
  stage.add(uiLayer);

  const transformer = createStyledTransformer(uiLayer);
  uiLayer.add(transformer);

  const selectionRect = new Konva.Rect({
    fill: "rgba(0,120,215,0.15)",
    stroke: "rgba(0,120,215,0.6)",
    strokeWidth: 1,
    visible: false,
  });
  uiLayer.add(selectionRect);

  const camera = new KonvaCamera(stage, contentLayer, uiLayer);

  let webgl: WebGLFilterRenderer | null = null;
  try {
    if (WebGLFilterRenderer.isSupported()) {
      webgl = new WebGLFilterRenderer();
    }
  } catch {
    webgl = null;
  }

  const nodeFactory = new KonvaNodeFactory(stage, webgl);
  const cropOverlay = new KonvaCropOverlay(
    uiLayer,
    (rect) => callbacks.onCropChange?.(rect),
    (rect) => camera.fitToRect(rect, 24),
  );

  setupInteraction({
    stage,
    selectionRect,
    uiLayer,
    nodeMap,
    camera,
    callbacks: {
      onBlockClick: (blockId, event) => callbacks.onBlockClick?.(blockId, event),
      onBlockDblClick: (blockId) => callbacks.onBlockDblClick?.(blockId),
      onStageClick: (worldPos) => callbacks.onStageClick?.(worldPos),
      onZoomChange: (zoom) => callbacks.onZoomChange?.(zoom),
    },
  });

  camera.setPageSize(pageW, pageH);
  camera.fitToScreen({ width: pageW, height: pageH, padding: 48 });

  return {
    stage,
    contentLayer,
    uiLayer,
    transformer,
    selectionRect,
    camera,
    nodeFactory,
    cropOverlay,
    webgl,
  };
}
