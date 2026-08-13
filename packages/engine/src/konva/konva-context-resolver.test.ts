import Konva from "konva";
import { beforeEach, describe, expect, it } from "vitest";
import { directChildUnderTarget, isMarqueeCandidate, resolveHit } from "./konva-context-resolver";

/**
 * Build a Konva tree mirroring the block tree:
 *   layer
 *     G1 (group)
 *       C1 (child rect)
 *       G2 (nested group)
 *         C2 (child rect)
 *     G3 (sibling group)
 */
function buildTree() {
  const root = new Konva.Group();
  const mk = (blockId: number, group: boolean) => {
    const node = group ? new Konva.Group() : new Konva.Rect();
    node.setAttr("blockId", blockId);
    if (group) node.setAttr("isGroup", true);
    return node;
  };
  const G1 = mk(1, true) as Konva.Group;
  const C1 = mk(2, false);
  const G2 = mk(3, true) as Konva.Group;
  const C2 = mk(4, false);
  const G3 = mk(5, true) as Konva.Group;
  root.add(G1);
  root.add(G3 as Konva.Group);
  G1.add(C1 as Konva.Shape);
  G1.add(G2);
  G2.add(C2 as Konva.Shape);
  return { root, G1, C1, G2, C2, G3 };
}

describe("konva-context-resolver", () => {
  let t: ReturnType<typeof buildTree>;
  beforeEach(() => {
    t = buildTree();
  });

  it("top level: a hit on a grandchild resolves to the OUTERMOST group", () => {
    const r = resolveHit(t.C2, []);
    expect(r?.blockId).toBe(1); // G1
    expect(r?.isGroup).toBe(true);
    expect(r?.insideContext).toBe(false);
  });

  it("top level: a hit on a direct child also resolves to the outermost group", () => {
    expect(resolveHit(t.C1, [])?.blockId).toBe(1);
  });

  it("top level: a released group child resolves only to itself on the next click", () => {
    t.C1.moveTo(t.root);

    const resolved = resolveHit(t.C1, []);

    expect(resolved?.blockId).toBe(2);
    expect(resolved?.node).toBe(t.C1);
    expect(resolved?.isGroup).toBe(false);
  });

  it("inside a context: resolves to the DIRECT CHILD of that context", () => {
    // Inside G1, clicking C1 → the member C1.
    const r = resolveHit(t.C1, [1]);
    expect(r?.blockId).toBe(2);
    expect(r?.isDirectChild).toBe(true);
    expect(r?.insideContext).toBe(true);
  });

  it("inside a context: a hit on a nested grandchild resolves to the direct child (the nested group)", () => {
    const r = resolveHit(t.C2, [1]);
    expect(r?.blockId).toBe(3); // G2 is the direct child of G1
    expect(r?.isGroup).toBe(true);
    expect(r?.isDirectChild).toBe(true);
  });

  it("nested context: resolves to the deepest member", () => {
    const r = resolveHit(t.C2, [1, 3]);
    expect(r?.blockId).toBe(4); // C2
    expect(r?.isDirectChild).toBe(true);
  });

  it("a hit outside the active context resolves to the outermost block (insideContext=false)", () => {
    const r = resolveHit(t.G3, [1]);
    expect(r?.blockId).toBe(5);
    expect(r?.insideContext).toBe(false);
  });

  it("directChildUnderTarget finds the member of a group under the cursor", () => {
    expect(directChildUnderTarget(t.C2, t.G1)).toBe(3); // G2
    expect(directChildUnderTarget(t.C1, t.G1)).toBe(2); // C1
  });

  describe("isMarqueeCandidate", () => {
    it("at top level, selects only nodes NOT nested in a group", () => {
      // G1 and G3 are direct children of the layer → candidates.
      expect(isMarqueeCandidate(t.G1, null)).toBe(true);
      expect(isMarqueeCandidate(t.G3, null)).toBe(true);
      // C1 / G2 / C2 are nested inside a group → not candidates.
      expect(isMarqueeCandidate(t.C1, null)).toBe(false);
      expect(isMarqueeCandidate(t.G2, null)).toBe(false);
      expect(isMarqueeCandidate(t.C2, null)).toBe(false);
    });

    it("inside a context, selects only DIRECT children of the active group", () => {
      // Active context = G1 → its direct children (C1, G2) are candidates.
      expect(isMarqueeCandidate(t.C1, t.G1)).toBe(true);
      expect(isMarqueeCandidate(t.G2, t.G1)).toBe(true);
      // Deeper (C2) and siblings (G3) are not.
      expect(isMarqueeCandidate(t.C2, t.G1)).toBe(false);
      expect(isMarqueeCandidate(t.G3, t.G1)).toBe(false);
    });
  });
});

describe("grouped-child coordinates inside a rotated group", () => {
  it("node.position() stays LOCAL (parent-relative) — no abs↔local math needed", () => {
    const root = new Konva.Group();
    const group = new Konva.Group({ x: 100, y: 50, rotation: 90 });
    group.setAttr("isGroup", true);
    root.add(group);

    const child = new Konva.Rect({ x: 10, y: 0 });
    group.add(child);

    // dragend / transformend read node.position(): these are LOCAL to the group,
    // exactly what a grouped child stores — regardless of the group's rotation.
    expect(child.position()).toEqual({ x: 10, y: 0 });

    // The absolute position DOES reflect the group's rotation: local (10,0)
    // rotated 90° about the group origin (100,50) → (100, 60).
    const abs = child.getAbsolutePosition();
    expect(abs.x).toBeCloseTo(100);
    expect(abs.y).toBeCloseTo(60);

    // Moving the child writes back a LOCAL value with no conversion.
    child.position({ x: 25, y: 5 });
    expect(child.position()).toEqual({ x: 25, y: 5 });
  });
});
