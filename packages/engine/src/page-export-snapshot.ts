import type { BlockData } from "./block/block.types";
import { BlockSnapshot } from "./block/block-snapshot";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./block/property-keys";
import { validatePageDimensions } from "./page-properties";

export interface PageExportSnapshot {
  readonly page: BlockData;
  readonly blocks: ReadonlyMap<number, BlockData>;
  readonly width: number;
  readonly height: number;
}

/** Capture ownership and rendering dependencies before any asynchronous work. */
export function capturePageExport(
  pageId: number,
  resolveBlock: (id: number) => BlockData | undefined,
): PageExportSnapshot {
  const sources = new Map<number, BlockData>();
  const visiting = new Set<number>();
  const visit = (id: number, expectedType?: BlockData["type"]): void => {
    if (visiting.has(id)) throw new Error(`Cyclic page export graph at block ${id}`);
    const block = resolveBlock(id);
    if (!block) throw new Error(`Page export block ${id} not found`);
    if (expectedType && block.type !== expectedType) {
      throw new Error(`Page export block ${id} must be a ${expectedType}`);
    }
    if (sources.has(id)) return;
    visiting.add(id);
    sources.set(id, block);
    if (block.shapeId !== null) visit(block.shapeId, "shape");
    if (block.fillId !== null) visit(block.fillId, "fill");
    for (const effectId of block.effectIds) visit(effectId, "effect");
    const children = new Set<number>();
    for (const childId of block.children) {
      const child = resolveBlock(childId);
      if (children.has(childId) || child?.parentId !== id) {
        throw new Error(`Invalid page export ownership: block ${childId} under ${id}`);
      }
      if (child.type === "scene" || child.type === "page") {
        throw new Error(`Invalid nested ${child.type} ${childId} in page ${pageId}`);
      }
      children.add(childId);
      visit(childId);
    }
    visiting.delete(id);
  };
  visit(pageId, "page");
  const copier = new BlockSnapshot(sources);
  const blocks = new Map([...sources.keys()].map((id) => [id, copier.snapshot(id)!]));
  const page = blocks.get(pageId)!;
  const size = validatePageDimensions(
    page.properties[PAGE_WIDTH] ?? 1080,
    page.properties[PAGE_HEIGHT] ?? 1080,
  );
  return { page, blocks, ...size };
}
