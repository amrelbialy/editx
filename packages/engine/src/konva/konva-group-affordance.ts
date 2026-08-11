import Konva from "konva";

/** Opacity multiplier applied to blocks OUTSIDE the active group context. */
const DIM_FACTOR = 0.35;

export interface GroupContextVisualDeps {
  stack: readonly number[];
  nodeMap: Map<number, Konva.Node>;
  contentLayer: Konva.Container;
  outline: Konva.Rect;
  /** Base (block-authored) opacity for a block id. */
  baseOpacity: (id: number) => number;
}

/** True when `node` is `container` or a descendant of it. */
function isWithin(node: Konva.Node, container: Konva.Node): boolean {
  let current: Konva.Node | null = node;
  while (current) {
    if (current === container) return true;
    current = current.getParent();
  }
  return false;
}

/**
 * Apply the active group-context affordance to the content layer:
 * - only DIRECT children of the active container are draggable,
 * - blocks outside the active group's subtree are dimmed,
 * - a dashed outline is drawn around the active group (hidden at top level).
 *
 * Reads each block's base opacity from the store so exit/enter fully restores
 * authored opacity (no drift across repeated toggles).
 */
export function applyGroupContext(deps: GroupContextVisualDeps): void {
  const { stack, nodeMap, contentLayer, outline, baseOpacity } = deps;
  const activeId = stack.length > 0 ? stack[stack.length - 1] : null;
  const activeNode = activeId != null ? (nodeMap.get(activeId) ?? null) : null;
  const activeContainer: Konva.Node = activeNode ?? (contentLayer as unknown as Konva.Node);

  for (const [id, node] of nodeMap) {
    if (node.getAttr("isPage")) continue;
    node.draggable(node.getParent() === activeContainer);
    const base = baseOpacity(id);
    if (activeNode) {
      node.opacity(isWithin(node, activeNode) ? base : base * DIM_FACTOR);
    } else {
      node.opacity(base);
    }
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
