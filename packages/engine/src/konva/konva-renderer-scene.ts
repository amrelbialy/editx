import type { BlockData } from "../block/block.types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../block/property-keys";
import type { BlockExportOptions, ExportOptions } from "../editor-types";
import { getOwningPageId } from "../page-view-ownership";
import { clearImageCache } from "../utils/image-loader";
import { exportScene } from "./konva-export";
import { exportBlockNode } from "./konva-export-block";
import { createGroupOutline } from "./konva-group-affordance";
import { KonvaHoverOutline } from "./konva-hover-outline";
import { KonvaImageFillCrop } from "./konva-image-fill-crop";
import { applyImageFillCropPreviewFrame } from "./konva-image-fill-crop-preview";
import type { KonvaRendererBlocks } from "./konva-renderer-blocks";
import type { KonvaRendererContext } from "./konva-renderer-context";
import { createKonvaScene } from "./konva-scene-setup";
import { observeViewportResize } from "./konva-viewport-resize";

export class KonvaRendererScene {
  constructor(
    private readonly context: KonvaRendererContext,
    private readonly blocks: KonvaRendererBlocks,
  ) {}

  async init(root: HTMLElement): Promise<void> {
    this.context.rootEl = root;
  }

  async createScene(_sceneBlock: BlockData, pageBlock: BlockData): Promise<void> {
    const context = this.context;
    const callbacks = context.callbacks;

    // Tear down any previous scene before building a new one. On reload
    // (loadScene), blocks are restored with their original IDs, so stale
    // entries left in nodeMap would be reused by syncBlock and never attached
    // to the new content layer — leaving the canvas blank.
    if (context.stage) {
      this.blocks.pageView.dispose();
      context.resizeObserver?.disconnect();
      context.camera.dispose();
      context.cropOverlay?.destroy();
      context.webgl?.dispose();
      context.webgl = null;
      context.stage.destroy();
      context.nodeMap.clear();
    }

    const pageW = (pageBlock.properties[PAGE_WIDTH] as number) ?? 1080;
    const pageH = (pageBlock.properties[PAGE_HEIGHT] as number) ?? 1080;
    const scene = createKonvaScene(context.rootEl, pageW, pageH, context.nodeMap, {
      onPagePointerDown: (pageId) => callbacks.onPagePointerDown?.(pageId),
      onBlockClick: (blockId, event) => {
        if (!context.imageFillCrop?.isActive()) callbacks.onBlockClick?.(blockId, event);
      },
      onBlockDblClick: (blockId, screenPos) => {
        if (!context.imageFillCrop?.isActive()) callbacks.onBlockDblClick?.(blockId, screenPos);
      },
      onEnterGroup: (groupId, childId) => {
        if (!context.imageFillCrop?.isActive()) callbacks.onEnterGroup?.(groupId, childId);
      },
      onStageClick: (worldPos) => {
        if (!context.imageFillCrop?.isActive()) callbacks.onStageClick?.(worldPos);
      },
      onZoomChange: (zoom) => callbacks.onZoomChange?.(zoom),
      onBlockTransform: (blockId, phase) => {
        if (!context.imageFillCrop?.isActive()) callbacks.onBlockTransform?.(blockId, phase);
      },
      onCropChange: (rect) => callbacks.onCropChange?.(rect),
      getGroupContext: () => context.groupContext,
      getOwningPageId: (blockId) =>
        getOwningPageId({ get: (id) => callbacks.resolveBlock?.(id) }, blockId),
      getPageViewMode: () => context.pageView.mode,
      getActivePageId: () =>
        context.pageView.mode === "all-pages" ? null : context.pageView.activePageId,
      isInteractionEnabled: () => !context.imageFillCrop?.isActive(),
    });

    context.stage = scene.stage;
    context.contentLayer = scene.contentLayer;
    context.uiLayer = scene.uiLayer;
    context.transformer = scene.transformer;
    context.selectionRect = scene.selectionRect;
    context.camera = scene.camera;
    context.cropOverlay = scene.cropOverlay;
    context.camera.setPanChangeListener((pan) => {
      context.cropOverlay.refreshBlock();
      callbacks.onPanChange?.(pan);
    });
    context.nodeFactory = scene.nodeFactory;
    context.webgl = scene.webgl;
    context.updateAccentColor = scene.updateAccentColor;
    context.lastPageSize = { width: pageW, height: pageH };
    this.blocks.pageView.initialize(pageBlock);

    context.hoverOutline = new KonvaHoverOutline(
      context.uiLayer,
      context.contentLayer,
      context.transformer,
      context.camera,
      () => context.groupContext,
      "#4971FF",
      () => !context.imageFillCrop?.isActive(),
    );
    context.imageFillCrop = new KonvaImageFillCrop(
      context.stage,
      context.nodeMap,
      context.cropOverlay,
      (crop) => callbacks.onImageFillCropPreviewChange?.(crop),
      (blockId, frame, preview) =>
        applyImageFillCropPreviewFrame(
          context.nodeFactory,
          callbacks.resolveBlock,
          blockId,
          frame,
          preview,
        ),
      () => callbacks.onImageFillCropDismiss?.(),
    );

    context.groupContext = [];
    context.groupOutline = createGroupOutline();
    context.uiLayer.add(context.groupOutline);

    this.blocks.pageView.set(context.pageView);
    const getCurrentActiveBounds = () => {
      const view = context.pageView;
      return view.mode === "all-pages" || view.activePageId === null
        ? null
        : this.blocks.pageView.getBounds(view.activePageId);
    };
    const activeBounds = getCurrentActiveBounds();
    const canFitNow = context.stage.width() > 0 && context.stage.height() > 0;
    context.resizeObserver?.disconnect();
    context.resizeObserver = observeViewportResize({
      rootEl: context.rootEl,
      stage: context.stage,
      camera: context.camera,
      getPageSize: () => (canFitNow || getCurrentActiveBounds() ? undefined : context.lastPageSize),
      getInitialFitRect: () => (canFitNow ? null : getCurrentActiveBounds()),
      getCropFitRect: () => context.getCropFitRect(),
      onResize: () => {
        context.camera.completeResize?.();
        context.cropOverlay.refreshBlock();
      },
    });
    if (canFitNow) {
      if (activeBounds) context.camera.fitToRect(activeBounds, 48);
      else context.camera.fitToScreen?.({ width: pageW, height: pageH, padding: 48 });
      context.camera.preserveCenterOnNextResize?.();
    }
  }

  renderFrame(): void {
    const context = this.context;
    this.blocks.pageView.apply();
    this.blocks.applyGroupContext();
    if (context.transformer?.nodes().length > 0) {
      context.transformer.forceUpdate();
    }
    context.contentLayer?.batchDraw();
    context.uiLayer?.batchDraw();
  }

  setAccentColor(color: string): void {
    const context = this.context;
    context.updateAccentColor?.(color);
    context.cropOverlay?.setAccentColor(color);
    context.hoverOutline?.setAccentColor(color);
  }

  async exportScene(options: ExportOptions): Promise<Blob> {
    const context = this.context;
    if (!context.stage || !context.legacyPageSize) {
      throw new Error("Cannot export: scene not initialised");
    }
    return exportScene(
      context.stage,
      context.contentLayer,
      context.uiLayer,
      context.legacyPageSize,
      options,
      (capture) => this.blocks.pageView.withUnfiltered(capture),
    );
  }

  async exportBlock(blockId: number, options: BlockExportOptions): Promise<Blob> {
    const context = this.context;
    if (!context.stage) throw new Error("Cannot export: scene not initialised");
    const node = context.nodeMap.get(blockId);
    if (!node) throw new Error(`Cannot export: block ${blockId} has no rendered node`);
    return exportBlockNode(node, context.contentLayer, options, (capture) =>
      this.blocks.pageView.withUnfiltered(capture),
    );
  }

  dispose(): void {
    const context = this.context;
    this.blocks.pageView.dispose();
    context.resizeObserver?.disconnect();
    context.camera?.dispose();
    context.imageFillCrop?.hide();
    context.cropOverlay?.destroy();
    context.webgl?.dispose();
    context.webgl = null;
    context.stage?.destroy();
    context.nodeMap.clear();
    clearImageCache();
  }
}
