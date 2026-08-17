import Konva from "konva";
import type { BlockData } from "../block/block.types";
import { OPACITY, POSITION_X, POSITION_Y, ROTATION, VISIBLE } from "../block/property-keys";
import type { NodeCallbacks } from "./konva-node-factory";

/**
 * Create a Konva.Group for a `group` block. Grouped children are nested INSIDE
 * this node, so their stored (local, parent-relative) coordinates map straight
 * onto Konva without any absolute↔local conversion. The group is draggable so
 * moving it at top level moves the whole set; on resize we report the temporary
 * scale before resetting it so the engine can bake it into descendant geometry.
 */
export function createGroupNode(id: number, callbacks: NodeCallbacks): Konva.Group {
  const group = new Konva.Group({ name: `block-${id}`, draggable: true });
  group.setAttr("blockId", id);
  group.setAttr("isGroup", true);

  group.on("dragend", () => {
    const pos = group.position();
    callbacks.onDragEnd(id, pos.x, pos.y);
  });

  group.on("transformend", () => {
    const rotation = group.rotation();
    const { x, y } = group.position();
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    group.scaleX(1);
    group.scaleY(1);
    callbacks.onTransformEnd(id, { x, y, width: 0, height: 0, rotation, scaleX, scaleY });
  });

  return group;
}

/** Update a group node: position, rotation, opacity, visibility ONLY. */
export function updateGroupNode(node: Konva.Group, block: BlockData): void {
  const props = block.properties;
  node.setAttrs({
    x: (props[POSITION_X] as number) ?? 0,
    y: (props[POSITION_Y] as number) ?? 0,
    rotation: (props[ROTATION] as number) ?? 0,
    opacity: (props[OPACITY] as number) ?? 1,
    visible: (props[VISIBLE] as boolean) ?? true,
  });
}

/**
 * Resolve the Konva container a block's node belongs in: its parent group node
 * when the parent is a group, otherwise the flat content layer.
 */
export function containerForBlock(
  block: BlockData,
  nodeMap: Map<number, Konva.Node>,
  contentLayer: Konva.Container,
): Konva.Container {
  const pid = block.parentId;
  if (pid != null) {
    const parentNode = nodeMap.get(pid);
    if (parentNode?.getAttr("isGroup")) return parentNode as Konva.Group;
  }
  return contentLayer;
}

/**
 * Adopt already-existing child nodes into their group node, in store order.
 * Idempotent — makes nesting order-independent across create/undo/redo flushes.
 */
export function nestGroupChildren(
  groupNode: Konva.Group,
  childIds: readonly number[],
  nodeMap: Map<number, Konva.Node>,
): void {
  for (const childId of childIds) {
    const childNode = nodeMap.get(childId);
    if (childNode && childNode.getParent() !== groupNode) {
      childNode.moveTo(groupNode);
    }
  }
}
