import type { BlockExportOptions, ExportOptions } from "./editor-types";
import type { EngineCore } from "./engine-core";

export async function exportScene(engine: EngineCore, options?: ExportOptions): Promise<Blob> {
  const renderer = engine.getRenderer();
  if (!renderer) throw new Error("Cannot export: no renderer attached");
  return renderer.exportScene({
    format: options?.format ?? "png",
    quality: options?.quality ?? 0.92,
    pixelRatio: options?.pixelRatio ?? 1,
  });
}

export async function exportBlock(
  engine: EngineCore,
  blockId: number,
  options: BlockExportOptions,
): Promise<Blob> {
  const renderer = engine.getRenderer();
  if (!renderer) throw new Error("Cannot export: no renderer attached");
  const block = engine._getBlockStore().get(blockId);
  if (!block) throw new Error(`Cannot export: block ${blockId} does not exist`);
  if (!["graphic", "text", "image", "group"].includes(block.type)) {
    throw new Error(`Cannot export unsupported block type: ${block.type}`);
  }
  validateBlockExportOptions(options);
  engine.renderDirty();
  return renderer.exportBlock(blockId, {
    ...options,
    padding: options.padding ?? 0,
    pixelRatio: options.pixelRatio ?? 1,
  });
}

function validateBlockExportOptions(options: BlockExportOptions): void {
  if (!Number.isInteger(options.width) || options.width <= 0) {
    throw new RangeError("Block export width must be a positive integer");
  }
  if (!Number.isInteger(options.height) || options.height <= 0) {
    throw new RangeError("Block export height must be a positive integer");
  }
  const padding = options.padding ?? 0;
  if (
    !Number.isFinite(padding) ||
    padding < 0 ||
    padding * 2 >= Math.min(options.width, options.height)
  ) {
    throw new RangeError("Block export padding must leave a positive inner rectangle");
  }
  const pixelRatio = options.pixelRatio ?? 1;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("Block export pixelRatio must be positive");
  }
}
