import type { BlockData } from "./block/block.types";
import { getDocumentRootSceneId } from "./document-state";
import type { BlockExportOptions, ExportOptions } from "./editor-types";
import type { EngineCore } from "./engine-core";
import { PageExportError } from "./page-export-error";
import { readPageProperties, requireScenePage } from "./page-properties";

const DOCUMENT_PREVIEW_MAX_EDGE = 512;

export async function exportPage(
  engine: EngineCore,
  pageId: number,
  options?: ExportOptions,
): Promise<Blob> {
  requirePageForExport(engine, pageId);
  const normalized = normalizePageExportOptions(options);
  const renderer = engine.getRenderer();
  if (!renderer) throw new PageExportError("NO_RENDERER", pageId, "no renderer attached");
  if (!renderer.exportPage) {
    throw new PageExportError(
      "UNSUPPORTED_RENDERER",
      pageId,
      "renderer does not support page export",
    );
  }

  try {
    return await renderer.exportPage(pageId, normalized);
  } catch (cause) {
    if (cause instanceof PageExportError) throw cause;
    throw new PageExportError(
      "RENDER_FAILED",
      pageId,
      cause instanceof Error ? cause.message : "rendering failed",
      { cause },
    );
  }
}

export async function exportDocumentPreview(engine: EngineCore): Promise<Blob | null> {
  const rootSceneId = getDocumentRootSceneId(engine);
  if (rootSceneId === null) return null;
  const store = engine._getBlockStore();
  const scene = store.get(rootSceneId);
  let pageId: number | undefined;
  const seen = new Set<number>();
  for (const childId of scene?.children ?? []) {
    const child = store.get(childId);
    if (!child || child.parentId !== rootSceneId || seen.has(childId)) {
      throw new PageExportError("RENDER_FAILED", childId, "invalid authored root graph");
    }
    seen.add(childId);
    if (pageId === undefined && child.type === "page") pageId = childId;
  }
  if (pageId === undefined) return null;
  const renderer = engine.getRenderer();
  if (!renderer?.exportDocumentPreview) return null;

  try {
    const page = requireScenePage(store, rootSceneId, pageId);
    const { width, height } = readPageProperties(page);
    const pixelRatio = Math.min(1, DOCUMENT_PREVIEW_MAX_EDGE / Math.max(width, height));
    const blob = await renderer.exportDocumentPreview(
      pageId,
      Object.freeze({ format: "png", quality: 0.92, pixelRatio }),
    );
    if (blob.type !== "image/png") throw new Error(`received ${blob.type || "an untyped blob"}`);
    return blob;
  } catch (cause) {
    if (cause instanceof PageExportError) throw cause;
    throw new PageExportError(
      "RENDER_FAILED",
      pageId,
      cause instanceof Error ? cause.message : "rendering failed",
      { cause },
    );
  }
}

export function requirePageForExport(engine: EngineCore, pageId: number): BlockData {
  const sceneId = engine.getActiveScene();
  try {
    return requireScenePage(engine._getBlockStore(), sceneId, pageId);
  } catch (cause) {
    throw new PageExportError(
      sceneId === null ? "NO_ACTIVE_SCENE" : "PAGE_NOT_FOUND",
      pageId,
      cause instanceof Error ? cause.message : "Invalid page",
      { cause },
    );
  }
}

export function normalizePageExportOptions(
  options?: ExportOptions,
): Readonly<Required<ExportOptions>> {
  if (
    options !== undefined &&
    (options === null || typeof options !== "object" || Array.isArray(options))
  ) {
    throw new TypeError("Page export options must be an object");
  }
  const format = options?.format === undefined ? "png" : options.format;
  if (!["png", "jpeg", "webp"].includes(format)) {
    throw new TypeError("Page export format must be png, jpeg, or webp");
  }
  const quality = options?.quality === undefined ? 0.92 : options.quality;
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new RangeError("Page export quality must be a finite number between 0 and 1");
  }
  const pixelRatio = options?.pixelRatio === undefined ? 1 : options.pixelRatio;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("Page export pixelRatio must be a finite positive number");
  }
  return Object.freeze({ format, quality, pixelRatio });
}

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
