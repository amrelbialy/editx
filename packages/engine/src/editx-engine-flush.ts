import type { BlockData } from "./block/block.types";
import type { BlockStore } from "./block/block-store";
import type { BlockEvent, EventAPI } from "./event-api";
import type { Patch } from "./history-manager";
import type { RendererAdapter } from "./render-adapter";

export function enqueueBlockEvents(patches: Patch[], eventApi: EventAPI): void {
  for (const p of patches) {
    let type: BlockEvent["type"];
    if (p.before === null) type = "created";
    else if (p.after === null) type = "destroyed";
    else type = "updated";
    eventApi._enqueue({ type, block: p.id });
  }
}

export function applyHistoryPatches(
  patches: Patch[],
  blockStore: BlockStore,
  dirty: Set<number>,
  eventApi: EventAPI,
): void {
  for (const p of patches) {
    if (p.after === null) blockStore.destroy(p.id);
    else blockStore.restore(p.after as BlockData);
    dirty.add(p.id);
  }
  enqueueBlockEvents(patches, eventApi);
}

export function flushDirtyBlocks(
  dirty: Set<number>,
  blockStore: BlockStore,
  renderer: RendererAdapter,
  eventApi: EventAPI,
): void {
  for (const id of [...dirty]) {
    const block = blockStore.get(id);
    if (block && (block.type === "effect" || block.type === "fill" || block.type === "shape")) {
      const ownerId = blockStore.findSubBlockOwner(id);
      if (ownerId !== null) dirty.add(ownerId);
    }
  }

  const dirtyIds = [...dirty];
  dirty.clear();

  const t0 = typeof window !== "undefined" && (window as any).__EX_PERF ? performance.now() : 0;
  for (const id of dirtyIds) {
    const block = blockStore.get(id);
    if (block) renderer.syncBlock(id, block);
    else renderer.removeBlock(id);
  }

  for (const id of dirtyIds) {
    const block = blockStore.get(id);
    if (block?.type === "page" && block.children.length > 0) {
      renderer.syncChildOrder?.(block.children);
    }
  }
  const tSync = typeof window !== "undefined" && (window as any).__EX_PERF ? performance.now() : 0;

  renderer.renderFrame();
  if (typeof window !== "undefined" && (window as any).__EX_PERF) {
    const tEnd = performance.now();
    console.log(
      `[perf:flush] syncBlocks: ${(tSync - t0).toFixed(2)}ms | renderFrame: ${(tEnd - tSync).toFixed(2)}ms | total: ${(tEnd - t0).toFixed(2)}ms (${dirtyIds.length} dirty)`,
    );
  }

  eventApi._flush();
}
