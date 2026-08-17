import type { EditxEngine } from "@editx/engine";
import { createEngine } from "@editx/engine/konva";
import type { ImageEditorConfig, TextPreset } from "../config/config.types";
import { insertShapePreset } from "../hooks/insert-shape-preset";
import { insertTextPreset } from "../hooks/insert-text-preset";
import { PresetThumbnailCache } from "./preset-thumbnail-cache";
import {
  getPresetThumbnailFingerprint,
  PRESET_THUMBNAIL_EXPORT,
  PRESET_THUMBNAIL_PAGE,
  type RasterPreset,
} from "./preset-thumbnail-spec";

export type { RasterPreset } from "./preset-thumbnail-spec";

export class PresetThumbnailRenderer {
  #config: ImageEditorConfig;
  #cache = new PresetThumbnailCache();
  #container: HTMLDivElement | null = null;
  #enginePromise: Promise<EditxEngine> | null = null;
  #queue = Promise.resolve();
  #disposed = false;

  constructor(config: ImageEditorConfig) {
    this.#config = config;
  }

  render(preset: RasterPreset): Promise<string> {
    if (this.#disposed) return Promise.reject(new Error("Thumbnail renderer is disposed"));
    const key = getPresetThumbnailFingerprint(preset, this.#config);
    return this.#cache.get(key, () => this.#enqueue(() => this.#renderBlob(preset)));
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#cache.dispose();
    this.#queue = this.#queue.then(
      () => this.#releaseEngine(),
      () => this.#releaseEngine(),
    );
  }

  #enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = () => {
      if (this.#disposed) throw new Error("Thumbnail renderer is disposed");
      return task();
    };
    const result = this.#queue.then(run, run);
    this.#queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #renderBlob(preset: RasterPreset): Promise<Blob> {
    const engine = await this.#getEngine();
    const pageId = engine.scene.getCurrentPage();
    if (pageId === null) throw new Error("Thumbnail renderer has no page");

    engine.beginSilent();
    let blockId: number | undefined;
    try {
      blockId = isTextPreset(preset)
        ? insertTextPreset(
            {
              engine,
              pageId,
              pageW: PRESET_THUMBNAIL_PAGE.width,
              pageH: PRESET_THUMBNAIL_PAGE.height,
              scaleFactor: 1,
              config: this.#config.text ?? {},
            },
            preset,
          )
        : insertShapePreset(
            {
              engine,
              pageId,
              pageW: PRESET_THUMBNAIL_PAGE.width,
              pageH: PRESET_THUMBNAIL_PAGE.height,
              config: this.#config.shapes ?? {},
            },
            preset,
          );
    } finally {
      engine.endSilent();
    }
    if (blockId === undefined) throw new Error(`Could not render preset ${preset.id}`);

    try {
      await document.fonts?.ready;
      return await engine.exportBlock(blockId, PRESET_THUMBNAIL_EXPORT);
    } finally {
      engine.beginSilent();
      engine.block.destroy(blockId);
      engine.endSilent();
      engine.clearHistory();
    }
  }

  async #getEngine(): Promise<EditxEngine> {
    if (this.#disposed) throw new Error("Thumbnail renderer is disposed");
    this.#enginePromise ??= this.#createEngine();
    return this.#enginePromise;
  }

  async #releaseEngine(): Promise<void> {
    try {
      const engine = await this.#enginePromise;
      engine?.dispose();
    } catch {
      // Engine creation failures require only container cleanup.
    }
    this.#enginePromise = null;
    this.#container?.remove();
    this.#container = null;
  }

  async #createEngine(): Promise<EditxEngine> {
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: `${PRESET_THUMBNAIL_PAGE.width}px`,
      height: `${PRESET_THUMBNAIL_PAGE.height}px`,
      pointerEvents: "none",
      visibility: "hidden",
    });
    document.body.append(container);
    this.#container = container;
    const engine = await createEngine({ container });
    await engine.scene.create(PRESET_THUMBNAIL_PAGE);
    return engine;
  }
}

function isTextPreset(preset: RasterPreset): preset is TextPreset {
  return "blocks" in preset;
}
