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
  const sourceBlocks = collectPageBlocks(pageId, resolveBlock);
  const snapshotter = new BlockSnapshot(sourceBlocks);
  const blocks = new Map<number, BlockData>();
  for (const blockId of sourceBlocks.keys()) {
    blocks.set(blockId, snapshotter.snapshot(blockId)!);
  }

  const page = blocks.get(pageId)!;
  const dimensions = validatePageDimensions(
    page.properties[PAGE_WIDTH] ?? 1080,
    page.properties[PAGE_HEIGHT] ?? 1080,
  );
  return { page, blocks, ...dimensions };
}

function collectPageBlocks(
  pageId: number,
  resolveBlock: (id: number) => BlockData | undefined,
): Map<number, BlockData> {
  const sourceBlocks = new Map<number, BlockData>();
  const activePath = new Set<number>();

  function visitBlock(blockId: number, expectedType?: BlockData["type"]): void {
    if (activePath.has(blockId)) {
      throw new Error(`Cyclic page export graph at block ${blockId}`);
    }
    const block = resolveBlock(blockId);
    if (!block) throw new Error(`Page export block ${blockId} not found`);
    if (expectedType && block.type !== expectedType) {
      throw new Error(`Page export block ${blockId} must be a ${expectedType}`);
    }
    if (sourceBlocks.has(blockId)) return;

    activePath.add(blockId);
    sourceBlocks.set(blockId, block);
    if (block.shapeId !== null) visitBlock(block.shapeId, "shape");
    if (block.fillId !== null) visitBlock(block.fillId, "fill");
    for (const effectId of block.effectIds) visitBlock(effectId, "effect");
    visitChildren(block);
    activePath.delete(blockId);
  }

  function visitChildren(parent: BlockData): void {
    const seenChildIds = new Set<number>();
    for (const childId of parent.children) {
      const child = resolveBlock(childId);
      if (seenChildIds.has(childId) || child?.parentId !== parent.id) {
        throw new Error(`Invalid page export ownership: block ${childId} under ${parent.id}`);
      }
      if (child.type === "scene" || child.type === "page") {
        throw new Error(`Invalid nested ${child.type} ${childId} in page ${pageId}`);
      }
      seenChildIds.add(childId);
      visitBlock(childId);
    }
  }

  visitBlock(pageId, "page");
  return sourceBlocks;
}
