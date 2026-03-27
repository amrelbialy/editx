import type { EngineCore } from "../engine-core";
import * as H from "./block-api-helpers";
import {
  CROP_ASPECT_RATIO_LOCKED,
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_ROTATION,
  CROP_SCALE_RATIO,
  CROP_SCALE_X,
  CROP_SCALE_Y,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  PAGE_HEIGHT,
  PAGE_WIDTH,
} from "./property-keys";

/** Pure crop operations — scale, translation, flip, aspect ratio, reset. */
export class BlockCropAPI {
  #engine: EngineCore;

  /** @internal — callback wired by EditxEngine for crop overlay routing. */
  #applyCropRatioHandler: ((ratio: number | null) => any) | null = null;
  #applyCropDimensionsHandler: ((w: number, h: number) => any) | null = null;
  #getCropVisualDimensionsHandler: (() => { width: number; height: number } | null) | null = null;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  // ── Handler wiring (called by EditxEngine) ─────

  /** @internal */
  _setApplyCropRatioHandler(handler: (ratio: number | null) => any): void {
    this.#applyCropRatioHandler = handler;
  }

  /** @internal */
  _setApplyCropDimensionsHandler(handler: (w: number, h: number) => any): void {
    this.#applyCropDimensionsHandler = handler;
  }

  /** @internal */
  _setGetCropVisualDimensionsHandler(
    handler: () => { width: number; height: number } | null,
  ): void {
    this.#getCropVisualDimensionsHandler = handler;
  }

  // ── Crop queries ──────────────────────────────────

  hasCrop(id: number): boolean {
    return this.supportsCrop(id) && H.getBool(this.#engine, id, CROP_ENABLED);
  }

  supportsCrop(id: number): boolean {
    const type = this.#engine.getBlockStore().getType(id);
    return type === "image" || type === "page";
  }

  // ── Crop scale/translation ────────────────────────

  setCropScaleX(id: number, scaleX: number): void {
    H.setFloat(this.#engine, id, CROP_SCALE_X, scaleX);
  }
  getCropScaleX(id: number): number {
    return H.getFloat(this.#engine, id, CROP_SCALE_X);
  }

  setCropScaleY(id: number, scaleY: number): void {
    H.setFloat(this.#engine, id, CROP_SCALE_Y, scaleY);
  }
  getCropScaleY(id: number): number {
    return H.getFloat(this.#engine, id, CROP_SCALE_Y);
  }

  setCropRotation(id: number, rotation: number): void {
    H.setFloat(this.#engine, id, CROP_ROTATION, rotation);
  }
  getCropRotation(id: number): number {
    return H.getFloat(this.#engine, id, CROP_ROTATION);
  }

  setCropScaleRatio(id: number, scaleRatio: number): void {
    H.setFloat(this.#engine, id, CROP_SCALE_RATIO, scaleRatio);
  }
  getCropScaleRatio(id: number): number {
    return H.getFloat(this.#engine, id, CROP_SCALE_RATIO);
  }

  setCropTranslationX(id: number, translationX: number): void {
    H.setFloat(this.#engine, id, CROP_X, translationX);
  }
  getCropTranslationX(id: number): number {
    return H.getFloat(this.#engine, id, CROP_X);
  }

  setCropTranslationY(id: number, translationY: number): void {
    H.setFloat(this.#engine, id, CROP_Y, translationY);
  }
  getCropTranslationY(id: number): number {
    return H.getFloat(this.#engine, id, CROP_Y);
  }

  // ── Crop flip & aspect ratio ──────────────────────

  flipCropHorizontal(id: number): void {
    H.setBool(
      this.#engine,
      id,
      CROP_FLIP_HORIZONTAL,
      !H.getBool(this.#engine, id, CROP_FLIP_HORIZONTAL),
    );
  }
  isCropFlippedHorizontal(id: number): boolean {
    return H.getBool(this.#engine, id, CROP_FLIP_HORIZONTAL);
  }

  flipCropVertical(id: number): void {
    H.setBool(
      this.#engine,
      id,
      CROP_FLIP_VERTICAL,
      !H.getBool(this.#engine, id, CROP_FLIP_VERTICAL),
    );
  }
  isCropFlippedVertical(id: number): boolean {
    return H.getBool(this.#engine, id, CROP_FLIP_VERTICAL);
  }

  isCropAspectRatioLocked(id: number): boolean {
    return H.getBool(this.#engine, id, CROP_ASPECT_RATIO_LOCKED);
  }
  setCropAspectRatioLocked(id: number, locked: boolean): void {
    H.setBool(this.#engine, id, CROP_ASPECT_RATIO_LOCKED, locked);
  }

  // ── Complex crop operations ───────────────────────

  /** Resets crop to defaults. For page blocks, restores PAGE_WIDTH/HEIGHT. Single undo batch. */
  resetCrop(id: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, CROP_X, 0);
    H.setFloat(this.#engine, id, CROP_Y, 0);
    H.setFloat(this.#engine, id, CROP_WIDTH, 0);
    H.setFloat(this.#engine, id, CROP_HEIGHT, 0);
    H.setBool(this.#engine, id, CROP_ENABLED, false);
    H.setFloat(this.#engine, id, CROP_SCALE_X, 1);
    H.setFloat(this.#engine, id, CROP_SCALE_Y, 1);
    H.setFloat(this.#engine, id, CROP_ROTATION, 0);
    H.setFloat(this.#engine, id, CROP_SCALE_RATIO, 1);
    H.setBool(this.#engine, id, CROP_FLIP_HORIZONTAL, false);
    H.setBool(this.#engine, id, CROP_FLIP_VERTICAL, false);
    H.setBool(this.#engine, id, CROP_ASPECT_RATIO_LOCKED, false);
    const blockType = this.#engine.getBlockStore().getType(id);
    if (blockType === "page") {
      const origW = H.getFloat(this.#engine, id, IMAGE_ORIGINAL_WIDTH);
      const origH = H.getFloat(this.#engine, id, IMAGE_ORIGINAL_HEIGHT);
      if (origW > 0 && origH > 0) {
        H.setFloat(this.#engine, id, PAGE_WIDTH, origW);
        H.setFloat(this.#engine, id, PAGE_HEIGHT, origH);
      }
    }
    this.#engine.endBatch();
  }

  applyCropRatio(_id: number, ratio: number | null): void {
    this.#applyCropRatioHandler?.(ratio);
  }

  applyCropDimensions(_id: number, width: number, height: number): void {
    this.#applyCropDimensionsHandler?.(width, height);
  }

  getCropVisualDimensions(_id: number): { width: number; height: number } | null {
    return this.#getCropVisualDimensionsHandler?.() ?? null;
  }

  adjustCropToFillFrame(id: number): void {
    const w = H.getFloat(this.#engine, id, "transform/size/width");
    const h = H.getFloat(this.#engine, id, "transform/size/height");
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, CROP_X, 0);
    H.setFloat(this.#engine, id, CROP_Y, 0);
    H.setFloat(this.#engine, id, CROP_WIDTH, w);
    H.setFloat(this.#engine, id, CROP_HEIGHT, h);
    H.setBool(this.#engine, id, CROP_ENABLED, true);
    this.#engine.endBatch();
  }
}
