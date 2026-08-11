import type Konva from "konva";

/**
 * Result of resolving a raw Konva hit into the block a gesture should act on,
 * given the active group context.
 */
export interface ResolvedHit {
  /** The block id the gesture resolves to (whole group at top level; member inside a context). */
  blockId: number;
  node: Konva.Node;
  /** True when the hit lies within the active context's subtree. */
  insideContext: boolean;
  /** True when the resolved block is a DIRECT child of the active context (top of stack). */
  isDirectChild: boolean;
  /** True when the resolved node is itself a group block. */
  isGroup: boolean;
}

/** Walk up collecting block-bearing nodes, innermost→outermost, stopping at the page. */
function blockAncestry(target: Konva.Node): Konva.Node[] {
  const chain: Konva.Node[] = [];
  let current: Konva.Node | null = target;
  while (current) {
    if (current.getAttr("isPage")) break;
    if (current.getAttr("blockId") !== undefined) chain.push(current);
    current = current.getParent();
  }
  return chain;
}

/**
 * Context-aware hit resolution — the single shared rule for click, double-click,
 * drag, transform, and marquee. From the hit node, ascend to the block that is a
 * DIRECT CHILD of the active context (top of the stack), or to the OUTERMOST
 * group ancestor when the stack is empty.
 */
export function resolveHit(target: Konva.Node, stack: readonly number[]): ResolvedHit | null {
  const chain = blockAncestry(target);
  if (chain.length === 0) return null;

  const wrap = (node: Konva.Node, insideContext: boolean, isDirectChild: boolean): ResolvedHit => ({
    blockId: node.getAttr("blockId") as number,
    node,
    insideContext,
    isDirectChild,
    isGroup: node.getAttr("isGroup") === true,
  });

  const activeContextId = stack.length > 0 ? stack[stack.length - 1] : null;
  const outermost = chain[chain.length - 1];

  if (activeContextId == null) {
    // Top level → the outermost block ancestor (a group, or the block itself).
    return wrap(outermost, false, false);
  }

  const k = chain.findIndex((n) => n.getAttr("blockId") === activeContextId);
  if (k === -1) {
    // Hit lies outside the active context — resolve to the outermost block so the
    // caller can clear the context and select it.
    return wrap(outermost, false, false);
  }
  if (k === 0) {
    // Clicked the context group's own node (not a child) — resolve to the context.
    return wrap(chain[0], true, false);
  }
  // The direct child of the active context that contains the hit.
  return wrap(chain[k - 1], true, true);
}

/**
 * Find the direct child of `groupNode` that contains `target` (used to select the
 * member under the cursor right after entering a group). Returns null if none.
 */
export function directChildUnderTarget(target: Konva.Node, groupNode: Konva.Node): number | null {
  const chain = blockAncestry(target);
  const gid = groupNode.getAttr("blockId") as number;
  const k = chain.findIndex((n) => n.getAttr("blockId") === gid);
  if (k <= 0) return null;
  return chain[k - 1].getAttr("blockId") as number;
}

/**
 * Marquee scoping: a node is selectable by the marquee only when it is a DIRECT
 * child of the active context (or, at top level, a direct child of the content
 * layer — i.e. not nested inside any group). Pages are never selectable.
 */
export function isMarqueeCandidate(node: Konva.Node, activeContainer: Konva.Node | null): boolean {
  if (node.getAttr("isPage")) return false;
  const parent = node.getParent();
  if (activeContainer) return parent === activeContainer;
  return !(parent && parent.getAttr("isGroup") === true);
}
