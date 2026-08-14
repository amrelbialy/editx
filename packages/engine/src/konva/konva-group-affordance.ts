import Konva from "konva";

export interface GroupContextVisualDeps {
  stack: readonly number[];
  nodeMap: Map<number, Konva.Node>;
  contentLayer: Konva.Container;
  outline: Konva.Rect;
}

/**
 * Apply the active group-context affordance to the content layer:
 * - only DIRECT children of the active container are draggable,
 * - a dashed outline is drawn around the active group (hidden at top level).
 */
export function applyGroupContext(deps: GroupContextVisualDeps): void {
  const { stack, nodeMap, contentLayer, outline } = deps;
  const activeId = stack.length > 0 ? stack[stack.length - 1] : null;
  const activeNode = activeId != null ? (nodeMap.get(activeId) ?? null) : null;
  const activeContainer: Konva.Node = activeNode ?? (contentLayer as unknown as Konva.Node);

  for (const node of nodeMap.values()) {
    if (node.getAttr("isPage")) continue;
    node.draggable(node.getParent() === activeContainer);
  }

  if (activeNode) {
    const rect = activeNode.getClientRect({ relativeTo: contentLayer as Konva.Container });
    outline.setAttrs({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      visible: true,
    });
    outline.moveToTop();
  } else {
    outline.visible(false);
  }
}

/** Create the reusable dashed outline rect for the active-group affordance. */
export function createGroupOutline(): Konva.Rect {
  return new Konva.Rect({
    stroke: "#4971FF",
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
    visible: false,
    strokeScaleEnabled: false,
  });
}
