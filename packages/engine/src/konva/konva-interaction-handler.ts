import Konva from "konva";
import type { BlockClickEvent } from "../render-adapter";
import type { KonvaCamera } from "./konva-camera";
import { directChildUnderTarget, isMarqueeCandidate, resolveHit } from "./konva-context-resolver";
import { setupWheelZoom } from "./konva-wheel-zoom";

export interface InteractionCallbacks {
  onBlockClick?: (blockId: number, event: BlockClickEvent) => void;
  onBlockDblClick?: (blockId: number, screenPos: { x: number; y: number }) => void;
  onEnterGroup?: (groupId: number, childId: number | null) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  onBlockTransform?: (blockId: number, phase: "drag" | "resize") => void;
}

export interface InteractionDeps {
  stage: Konva.Stage;
  selectionRect: Konva.Rect;
  uiLayer: Konva.Layer;
  nodeMap: Map<number, Konva.Node>;
  camera: KonvaCamera;
  callbacks: InteractionCallbacks;
  /** Active group-context stack (outermost-first); `[]` = top level. */
  getGroupContext: () => number[];
  isInteractionEnabled?: () => boolean;
}

/** Returns true if the target is a background element (stage or page background). */
function isBackground(target: Konva.Node, stage: Konva.Stage): boolean {
  return target === stage || target.getAttr("isPageBackground") === true;
}

/**
 * Binds mouse/touch interaction to the Konva stage. Every gesture (click,
 * double-click, drag, transform, marquee) resolves the hit through ONE shared
 * context-aware resolver so they can never disagree about which block is meant.
 */
export function setupInteraction(deps: InteractionDeps): void {
  const { stage, selectionRect, uiLayer, nodeMap, camera, callbacks, getGroupContext } = deps;
  const isEnabled = deps.isInteractionEnabled ?? (() => true);

  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0;
  let selecting = false;

  // Live drag/resize — fires every frame while a block is moved or transformed.
  stage.on("dragmove transform", (e) => {
    const r = resolveHit(e.target as Konva.Node, getGroupContext());
    if (!r || r.node.getAttr("isPage")) return;
    callbacks.onBlockTransform?.(r.blockId, e.type === "dragmove" ? "drag" : "resize");
  });

  // Double-click → enter a group (first) or edit its member (second).
  stage.on("dblclick dbltap", (e) => {
    if (isBackground(e.target, stage)) return;
    const stack = getGroupContext();
    const r = resolveHit(e.target as Konva.Node, stack);
    if (!r || r.node.getAttr("isPage")) return;

    const activeId = stack.length > 0 ? stack[stack.length - 1] : null;
    if (r.isGroup && r.blockId !== activeId) {
      const childId = directChildUnderTarget(e.target as Konva.Node, r.node);
      callbacks.onEnterGroup?.(r.blockId, childId);
      return;
    }
    const pointer = stage.getPointerPosition();
    const container = stage.container().getBoundingClientRect();
    const screenPos = pointer
      ? { x: container.left + pointer.x, y: container.top + pointer.y }
      : { x: 0, y: 0 };
    callbacks.onBlockDblClick?.(r.blockId, screenPos);
  });

  // Single click → select the resolved block (or deselect on background).
  stage.on("click tap", (e) => {
    if (selectionRect.visible() && selectionRect.width() > 0) return;

    if (isBackground(e.target, stage)) {
      const pos = stage.getPointerPosition();
      const worldPos = pos ? camera.screenToWorld(pos) : { x: 0, y: 0 };
      callbacks.onStageClick?.(worldPos);
      return;
    }

    const r = resolveHit(e.target as Konva.Node, getGroupContext());
    if (!r || r.node.getAttr("isPage")) return;
    const shiftKey =
      (e.evt as MouseEvent).shiftKey ||
      (e.evt as MouseEvent).ctrlKey ||
      (e.evt as MouseEvent).metaKey;
    callbacks.onBlockClick?.(r.blockId, { shiftKey, insideContext: r.insideContext });
  });

  // Marquee — mousedown
  stage.on("mousedown touchstart", (e) => {
    if (!isEnabled()) return;
    if (!isBackground(e.target, stage)) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = camera.screenToWorld(pos);
    x1 = world.x;
    y1 = world.y;
    x2 = world.x;
    y2 = world.y;
    selecting = true;
    selectionRect.setAttrs({ x: x1, y: y1, width: 0, height: 0, visible: true });
  });

  // Marquee — mousemove
  stage.on("mousemove touchmove", () => {
    if (!isEnabled()) {
      selecting = false;
      selectionRect.visible(false);
      return;
    }
    if (!selecting) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = camera.screenToWorld(pos);
    x2 = world.x;
    y2 = world.y;
    selectionRect.setAttrs({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    });
    uiLayer.batchDraw();
  });

  // Marquee — mouseup (scoped to the active context's direct children)
  stage.on("mouseup touchend", () => {
    if (!isEnabled()) {
      selecting = false;
      selectionRect.visible(false);
      return;
    }
    if (!selecting) return;
    selecting = false;

    if (selectionRect.width() > 2 && selectionRect.height() > 2) {
      const selBox = selectionRect.getClientRect();
      const stack = getGroupContext();
      const activeId = stack.length > 0 ? stack[stack.length - 1] : null;
      const activeContainer = activeId != null ? (nodeMap.get(activeId) ?? null) : null;
      for (const [blockId, node] of nodeMap) {
        if (!isMarqueeCandidate(node, activeContainer)) continue;
        if (Konva.Util.haveIntersection(selBox, node.getClientRect())) {
          callbacks.onBlockClick?.(blockId, { shiftKey: true, additive: true });
        }
      }
    }

    setTimeout(() => {
      selectionRect.visible(false);
      uiLayer.batchDraw();
    });
  });

  setupWheelZoom(stage, camera, nodeMap, callbacks.onZoomChange);
}
