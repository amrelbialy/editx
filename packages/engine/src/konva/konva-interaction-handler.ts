import Konva from 'konva';
import type { KonvaCamera } from './konva-camera';

export interface InteractionCallbacks {
  onBlockClick?: (blockId: number, event: { shiftKey: boolean }) => void;
  onStageClick?: (worldPos: { x: number; y: number }) => void;
}

export interface InteractionDeps {
  stage: Konva.Stage;
  selectionRect: Konva.Rect;
  uiLayer: Konva.Layer;
  nodeMap: Map<number, Konva.Node>;
  camera: KonvaCamera;
  callbacks: InteractionCallbacks;
}

/**
 * Binds mouse/touch interaction events to the Konva stage:
 * click-to-select, marquee selection rectangle, and stage click.
 */
/** Returns true if the target is a background element (stage or page background). */
function isBackground(target: Konva.Node, stage: Konva.Stage): boolean {
  return target === stage || target.getAttr('isPageBackground') === true;
}

/**
 * Walk up from a clicked Konva node to find the nearest ancestor (or self)
 * that has a `blockId` attribute. Returns null if none found.
 */
function findBlockNode(target: Konva.Node): Konva.Node | null {
  let current: Konva.Node | null = target;
  while (current) {
    if (current.getAttr('blockId') !== undefined) return current;
    current = current.getParent();
  }
  return null;
}

export function setupInteraction(deps: InteractionDeps): void {
  const { stage, selectionRect, uiLayer, nodeMap, camera, callbacks } = deps;

  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0;
  let selecting = false;

  // Click on stage background → deselect
  stage.on('click tap', (e) => {
    if (selectionRect.visible() && selectionRect.width() > 0) {
      return;
    }

    if (isBackground(e.target, stage)) {
      const pos = stage.getPointerPosition();
      const worldPos = pos ? camera.screenToWorld(pos) : { x: 0, y: 0 };
      callbacks.onStageClick?.(worldPos);
      return;
    }

    // Check if click was on a block node (skip pages — they aren't selectable)
    const target = e.target as Konva.Node;
    const clickNode = findBlockNode(target);
    const blockId = clickNode?.getAttr('blockId') as number | undefined;
    if (blockId !== undefined && !clickNode?.getAttr('isPage')) {
      const shiftKey =
        (e.evt as MouseEvent).shiftKey ||
        (e.evt as MouseEvent).ctrlKey ||
        (e.evt as MouseEvent).metaKey;
      callbacks.onBlockClick?.(blockId, { shiftKey });
    }
  });

  // Selection rectangle — mousedown
  stage.on('mousedown touchstart', (e) => {
    if (!isBackground(e.target, stage)) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = camera.screenToWorld(pos);
    x1 = world.x;
    y1 = world.y;
    x2 = world.x;
    y2 = world.y;
    selecting = true;

    selectionRect.setAttrs({
      x: x1,
      y: y1,
      width: 0,
      height: 0,
      visible: true,
    });
  });

  // Selection rectangle — mousemove
  stage.on('mousemove touchmove', () => {
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

  // Selection rectangle — mouseup
  stage.on('mouseup touchend', () => {
    if (!selecting) return;
    selecting = false;

    if (selectionRect.width() > 2 && selectionRect.height() > 2) {
      const selBox = selectionRect.getClientRect();
      const selectedIds: number[] = [];
      for (const [blockId, node] of nodeMap) {
        // Skip page blocks — they aren't selectable
        if (node.getAttr('isPage')) continue;
        if (Konva.Util.haveIntersection(selBox, node.getClientRect())) {
          selectedIds.push(blockId);
        }
      }
      if (selectedIds.length > 0) {
        for (const id of selectedIds) {
          callbacks.onBlockClick?.(id, { shiftKey: true });
        }
      }
    }

    setTimeout(() => {
      selectionRect.visible(false);
      uiLayer.batchDraw();
    });
  });
}
