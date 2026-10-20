import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import type { RendererPageView } from "../page-view";
import type { BlockTransform } from "../render-adapter";
import { getNodeScreenTransform } from "./konva-block-screen-transform";
import { applyGroupContext } from "./konva-group-affordance";
import { containerForBlock, nestGroupChildren } from "./konva-group-node";
import { replaceIncompatibleNode } from "./konva-node-replacement";
import { KonvaPageView } from "./konva-page-view";
import type { KonvaRendererContext } from "./konva-renderer-context";

export class KonvaRendererBlocks {
  readonly pageView: KonvaPageView;
  #selectedBlockIds: number[] = [];
  #selectedBlockType?: string;

  constructor(private readonly context: KonvaRendererContext) {
    this.pageView = new KonvaPageView(context);
  }

  syncBlock(id: number, block: BlockData): void {
    if (
      block.type === "scene" ||
      block.type === "effect" ||
      block.type === "shape" ||
      block.type === "fill"
    )
      return;

    const context = this.context;
    if (!context.nodeFactory) return;
    let node = context.nodeMap.get(id);
    const callbacks = {
      onDragEnd: (blockId: number, x: number, y: number) =>
        context.callbacks.onBlockDragEnd?.(blockId, x, y),
      onTransformEnd: (blockId: number, transform: BlockTransform) => {
        if (context.imageFillCrop?.captureTransform(blockId, transform)) return;
        const anchor = context.transformer?.getActiveAnchor?.() ?? "";
        context.callbacks.onBlockTransformEnd?.(blockId, transform, anchor);
      },
      getActiveAnchor: () => context.transformer?.getActiveAnchor?.() ?? "",
    };

    if (!node) {
      const created = context.nodeFactory.createNode(
        id,
        block,
        callbacks,
        context.callbacks.resolveBlock,
      );
      if (!created) return;
      node = created;
      context.nodeMap.set(id, node);
      context.contentLayer.add(node as Konva.Group | Konva.Shape);
      context.hoverOutline.bind(node, () => this.pageView.isContinuous());
    } else {
      node = replaceIncompatibleNode({
        id,
        block,
        node,
        nodeMap: context.nodeMap,
        factory: context.nodeFactory,
        callbacks,
        transformer: context.transformer,
        contentLayer: context.contentLayer,
        bindHover: (replacement) =>
          context.hoverOutline.bind(replacement, () => this.pageView.isContinuous()),
        clearHover: (retired) => context.hoverOutline.clearNode(retired),
        resolveBlock: context.callbacks.resolveBlock,
      });
    }

    const result = context.nodeFactory.updateNode(node, block, context.callbacks.resolveBlock);
    context.imageFillCrop?.reapply(id);

    // Keep the Konva tree mirroring the block tree: nest grouped children inside
    // their group node so their stored coords stay parent-relative (no abs↔local
    // math), and re-home a block whenever its group membership changes.
    if (block.type === "group") {
      nestGroupChildren(node as Konva.Group, block.children, context.nodeMap);
    } else if (block.type !== "page") {
      const container = containerForBlock(block, context.nodeMap, context.contentLayer);
      if (node.getParent() !== container) node.moveTo(container);
    }

    context.transformer.moveToTop();
    if (result && result.autoHeight != null) {
      context.callbacks.onAutoSize?.(id, result.autoHeight);
    }
    if (result && result.autoWidth != null) {
      context.callbacks.onAutoWidth?.(id, result.autoWidth);
    }
    if (block.type === "page") {
      this.pageView.recordPage(block);
    }
    this.pageView.recordNodeSync(id, node);
  }

  setGroupContext(stack: number[]): void {
    const context = this.context;
    context.groupContext = [...stack];
    this.applyGroupContext();
    context.uiLayer.batchDraw();
    context.contentLayer.batchDraw();
  }

  applyGroupContext(): void {
    const context = this.context;
    if (!context.groupOutline) return;
    applyGroupContext({
      stack: context.groupContext,
      nodeMap: context.nodeMap,
      contentLayer: context.contentLayer,
      outline: context.groupOutline,
    });
  }

  syncChildOrder(childIds: number[]): void {
    const context = this.context;
    for (const childId of childIds) {
      context.nodeMap.get(childId)?.moveToTop();
    }
    context.transformer?.moveToTop();
  }

  setPageView(view: RendererPageView): void {
    this.pageView.set(view);
    if (this.#selectedBlockIds.length > 0) this.#renderTransformerSelection();
  }

  removeBlock(id: number): void {
    const context = this.context;
    const node = context.nodeMap.get(id);
    this.pageView.remove(id);
    this.#selectedBlockIds = this.#selectedBlockIds.filter((blockId) => blockId !== id);
    if (this.#selectedBlockIds.length === 0) this.#selectedBlockType = undefined;
    if (!node) return;
    const trNodes = context.transformer.nodes();
    if (trNodes.includes(node)) {
      context.transformer.nodes(trNodes.filter((candidate) => candidate !== node));
    }
    context.hoverOutline.clearNode(node);
    node.destroy();
    context.nodeMap.delete(id);
  }

  showTransformer(blockIds: number[], blockType?: string): void {
    const context = this.context;
    if (context.imageFillCrop?.isActive()) {
      this.hideTransformer();
      return;
    }
    this.#selectedBlockIds = [...blockIds];
    this.#selectedBlockType = blockType;
    this.#renderTransformerSelection();
  }

  #renderTransformerSelection(): void {
    const context = this.context;
    if (context.imageFillCrop?.isActive()) {
      context.transformer.nodes([]);
      context.uiLayer.batchDraw();
      return;
    }
    const nodes = this.#selectedBlockIds
      .map((id) => context.nodeMap.get(id))
      .filter((node): node is Konva.Node => !!node && node.isVisible());
    const isOutlineOnlyPage = this.#selectedBlockType === "page" && this.pageView.isContinuous();
    const isGroup = this.#selectedBlockType === "group";
    context.hoverOutline.hide();
    context.transformer.nodes(nodes);
    context.transformer.enabledAnchors(
      isOutlineOnlyPage
        ? []
        : isGroup
          ? ["top-left", "top-right", "bottom-left", "bottom-right"]
          : [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ],
    );
    context.transformer.keepRatio(true);
    context.transformer.flipEnabled(!isGroup && !isOutlineOnlyPage);
    context.transformer.rotateEnabled(!isOutlineOnlyPage);
    context.transformer.listening(!isOutlineOnlyPage);
    context.transformer._bindHoverEvents?.();
    context.uiLayer.batchDraw();
  }

  hideTransformer(): void {
    this.#selectedBlockIds = [];
    this.#selectedBlockType = undefined;
    this.context.transformer.nodes([]);
    this.context.uiLayer.batchDraw();
  }

  getSelectedBlockScreenRect(): { x: number; y: number; width: number; height: number } | null {
    const transformer = this.context.transformer;
    if (!transformer || transformer.nodes().length === 0) return null;
    const rect = transformer.getClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  getBlockScreenRect(
    blockId: number,
  ): { x: number; y: number; width: number; height: number } | null {
    const node = this.context.nodeMap.get(blockId);
    if (!node?.isVisible()) return null;
    const rect = node.getClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  getBlockScreenTransform(
    blockId: number,
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
    const node = this.context.nodeMap.get(blockId);
    return node?.isVisible() ? getNodeScreenTransform(node) : null;
  }
}
