import type { PageThumbnailExportOptions } from "./editor-types";
import {
  exportPage,
  normalizePageExportOptions,
  requirePageForExport,
} from "./editx-engine-export";
import type { EngineCore } from "./engine-core";
import { PageExportError } from "./page-export-error";
import { capturePageExport, type PageExportSnapshot } from "./page-export-snapshot";

const CACHE_CAPACITY = 64;

type ThumbnailOptions = Readonly<Required<PageThumbnailExportOptions>>;

export class PageThumbnailExporter {
  #cached = new Map<string, Blob>();
  #pending = new Map<string, Promise<Blob>>();
  #disposed = false;

  constructor(private readonly engine: EngineCore) {}

  async export(pageId: number, options?: PageThumbnailExportOptions): Promise<Blob> {
    this.#ensureActive(pageId);
    requirePageForExport(this.engine, pageId);
    const normalized = normalizeThumbnailOptions(options);
    const snapshot = this.#capturePage(pageId);
    const key = thumbnailKey(snapshot, normalized);

    const cached = this.#cached.get(key);
    if (cached) {
      this.#cached.delete(key);
      this.#cached.set(key, cached);
      return cached;
    }
    const pending = this.#pending.get(key);
    if (pending) return pending;

    const pixelRatio = Math.min(
      normalized.maxWidth / snapshot.width,
      normalized.maxHeight / snapshot.height,
      1,
    );
    const rendering = exportPage(this.engine, pageId, {
      format: normalized.format,
      quality: normalized.quality,
      pixelRatio,
    }).then(
      (blob) => {
        this.#ensureActive(pageId);
        this.#pending.delete(key);
        this.#cached.set(key, blob);
        if (this.#cached.size > CACHE_CAPACITY) {
          this.#cached.delete(this.#cached.keys().next().value!);
        }
        return blob;
      },
      (error: unknown) => {
        this.#pending.delete(key);
        throw error;
      },
    );
    this.#pending.set(key, rendering);
    return rendering;
  }

  dispose(): void {
    this.#disposed = true;
    this.#cached.clear();
    this.#pending.clear();
  }

  #ensureActive(pageId: number): void {
    if (this.#disposed) {
      throw new PageExportError("RENDER_FAILED", pageId, "page thumbnail exporter is disposed");
    }
  }

  #capturePage(pageId: number): PageExportSnapshot {
    try {
      return capturePageExport(pageId, (id) => this.engine._getBlockStore().get(id));
    } catch (cause) {
      throw new PageExportError(
        "RENDER_FAILED",
        pageId,
        cause instanceof Error ? cause.message : "invalid page graph",
        { cause },
      );
    }
  }
}

function normalizeThumbnailOptions(options?: PageThumbnailExportOptions): ThumbnailOptions {
  if (
    options !== undefined &&
    (options === null || typeof options !== "object" || Array.isArray(options))
  ) {
    throw new TypeError("Page thumbnail options must be an object");
  }
  const maxWidth = options?.maxWidth === undefined ? 256 : options.maxWidth;
  const maxHeight = options?.maxHeight === undefined ? 256 : options.maxHeight;
  for (const [name, value] of [
    ["maxWidth", maxWidth],
    ["maxHeight", maxHeight],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`Page thumbnail ${name} must be a positive integer`);
    }
  }
  const { format, quality } = normalizePageExportOptions({
    format: options?.format,
    quality: options?.quality,
  });
  return Object.freeze({ maxWidth, maxHeight, format, quality });
}

function thumbnailKey(snapshot: PageExportSnapshot, options: ThumbnailOptions): string {
  const blocks = [...snapshot.blocks.values()].sort((left, right) => left.id - right.id);
  return JSON.stringify({ version: 1, blocks, options }, (_key, value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
      );
    }
    return value;
  });
}
