import type { BlockData, BlockType } from "./block/block.types";
import type { ValidationContext } from "./document-validation-context";

interface Edge {
  readonly id: number;
  readonly context: ValidationContext;
}

export function validateBlockGraph(blocks: BlockData[], context: ValidationContext): void {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const children = new Map(blocks.map((block) => [block.id, new Set(block.children)]));
  const adjacency = new Map<number, Edge[]>();
  const owners = new Map<number, number>();
  const resources = new Set<BlockType>(["shape", "fill", "effect"]);
  const reference = (id: number, field: ValidationContext, type?: BlockType) => {
    const target = byId.get(id);
    if (!target) field.fail("MISSING_BLOCK_REFERENCE", `Missing referenced block ${id}`);
    else if (type && target.type !== type)
      field.fail("INVALID_BLOCK_TYPE", `Block ${id} must be a ${type}`);
    return target;
  };
  blocks.forEach((block, index) => {
    const item = context.at(index, block.id);
    const edges: Edge[] = [];
    adjacency.set(block.id, edges);
    if (block.parentId !== null) {
      const parent = reference(block.parentId, item.at("parentId"));
      if (parent && !children.get(parent.id)?.has(block.id))
        item.at("parentId").fail("INVALID_BLOCK_OWNERSHIP", "Parent does not list this child");
      if (block.type === "page" && parent && parent.type !== "scene")
        item.at("parentId").fail("INVALID_BLOCK_OWNERSHIP", "Page parent must be a scene");
    }
    if (resources.has(block.type) && (block.parentId !== null || block.children.length)) {
      item
        .at(block.parentId !== null ? "parentId" : "children")
        .fail("INVALID_BLOCK_OWNERSHIP", "Resource blocks must be hierarchy-detached leaves");
    }
    const seen = new Set<number>();
    block.children.forEach((id, childIndex) => {
      const field = item.at("children").at(childIndex);
      const child = reference(id, field);
      if (seen.has(id) || (owners.has(id) && owners.get(id) !== block.id))
        field.fail("INVALID_BLOCK_OWNERSHIP", "Child has duplicate or multiple parents");
      seen.add(id);
      owners.set(id, block.id);
      if (child && child.parentId !== block.id)
        field.fail("INVALID_BLOCK_OWNERSHIP", "Child parentId does not match its parent");
      edges.push({ id, context: field });
    });
    for (const [key, type] of [
      ["shapeId", "shape"],
      ["fillId", "fill"],
    ] as const) {
      const id = block[key];
      if (id === null) continue;
      const field = item.at(key);
      reference(id, field, type);
      if (block.type !== "graphic")
        field.fail("INVALID_BLOCK_OWNERSHIP", "Shape and fill references require a graphic");
      edges.push({ id, context: field });
    }
    const effects = new Set<number>();
    block.effectIds.forEach((id, effectIndex) => {
      const field = item.at("effectIds").at(effectIndex);
      reference(id, field, "effect");
      if (!["page", "image", "graphic"].includes(block.type) || effects.has(id))
        field.fail(
          "INVALID_BLOCK_OWNERSHIP",
          "Invalid effect source or duplicate effect reference",
        );
      effects.add(id);
      edges.push({ id, context: field });
    });
  });

  const state = new Map<number, "visiting" | "visited">();
  for (const block of blocks) {
    if (state.has(block.id)) continue;
    const stack = [{ id: block.id, index: 0 }];
    state.set(block.id, "visiting");
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const edges = adjacency.get(frame.id) ?? [];
      if (frame.index === edges.length) {
        state.set(frame.id, "visited");
        stack.pop();
        continue;
      }
      const edge = edges[frame.index++];
      if (!byId.has(edge.id)) continue;
      if (state.get(edge.id) === "visiting") {
        edge.context.fail("CYCLIC_BLOCK_GRAPH", `Cyclic block reference to ${edge.id}`);
      } else if (!state.has(edge.id)) {
        state.set(edge.id, "visiting");
        stack.push({ id: edge.id, index: 0 });
      }
    }
  }
  context.throwIfInvalid();
}
