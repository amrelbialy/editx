import type { EngineCore } from "../engine-core";
import { normalizeRotation } from "../utils/rotation-math";
import type { Color } from "./block.types";
import * as H from "./block-api-helpers";
import {
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  FILL_COLOR,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  IMAGE_ROTATION,
  IMAGE_SRC,
  PAGE_HEIGHT,
  PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_ENABLED,
  PAGE_MARGIN_LEFT,
  PAGE_MARGIN_RIGHT,
  PAGE_MARGIN_TOP,
  PAGE_WIDTH,
} from "./property-keys";

/** Page convenience methods and image rotation/flip. */
export class BlockPageAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  // ── Page dimensions ───────────────────────────────

  setPageDimensions(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, PAGE_WIDTH, width);
    H.setFloat(this.#engine, id, PAGE_HEIGHT, height);
    this.#engine.endBatch();
  }

  getPageDimensions(id: number): { width: number; height: number } {
    return {
      width: H.getFloat(this.#engine, id, PAGE_WIDTH) || 1080,
      height: H.getFloat(this.#engine, id, PAGE_HEIGHT) || 1080,
    };
  }

  // ── Page image source ─────────────────────────────

  setPageImageSrc(id: number, src: string): void {
    H.setString(this.#engine, id, IMAGE_SRC, src);
  }
  getPageImageSrc(id: number): string {
    return H.getString(this.#engine, id, IMAGE_SRC);
  }

  setPageImageOriginalDimensions(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, IMAGE_ORIGINAL_WIDTH, width);
    H.setFloat(this.#engine, id, IMAGE_ORIGINAL_HEIGHT, height);
    this.#engine.endBatch();
  }

  getPageImageOriginalDimensions(id: number): { width: number; height: number } {
    return {
      width: H.getFloat(this.#engine, id, IMAGE_ORIGINAL_WIDTH),
      height: H.getFloat(this.#engine, id, IMAGE_ORIGINAL_HEIGHT),
    };
  }

  // ── Page fill color ───────────────────────────────

  setPageFillColor(id: number, color: Color): void {
    H.setColor(this.#engine, id, FILL_COLOR, color);
  }
  getPageFillColor(id: number): Color {
    return H.getColor(this.#engine, id, FILL_COLOR);
  }

  // ── Page margins ──────────────────────────────────

  setPageMarginsEnabled(id: number, enabled: boolean): void {
    H.setBool(this.#engine, id, PAGE_MARGIN_ENABLED, enabled);
  }
  isPageMarginsEnabled(id: number): boolean {
    return H.getBool(this.#engine, id, PAGE_MARGIN_ENABLED);
  }

  setPageMargins(id: number, top: number, right: number, bottom: number, left: number): void {
    this.#engine.beginBatch();
    H.setBool(this.#engine, id, PAGE_MARGIN_ENABLED, true);
    H.setFloat(this.#engine, id, PAGE_MARGIN_TOP, top);
    H.setFloat(this.#engine, id, PAGE_MARGIN_RIGHT, right);
    H.setFloat(this.#engine, id, PAGE_MARGIN_BOTTOM, bottom);
    H.setFloat(this.#engine, id, PAGE_MARGIN_LEFT, left);
    this.#engine.endBatch();
  }

  getPageMargins(id: number): { top: number; right: number; bottom: number; left: number } {
    return {
      top: H.getFloat(this.#engine, id, PAGE_MARGIN_TOP),
      right: H.getFloat(this.#engine, id, PAGE_MARGIN_RIGHT),
      bottom: H.getFloat(this.#engine, id, PAGE_MARGIN_BOTTOM),
      left: H.getFloat(this.#engine, id, PAGE_MARGIN_LEFT),
    };
  }

  // ── Image rotation & flip ─────────────────────────

  setImageRotation(id: number, angleDeg: number): void {
    const clamped = Math.max(-180, Math.min(180, angleDeg));
    H.setFloat(this.#engine, id, IMAGE_ROTATION, clamped);
  }

  getImageRotation(id: number): number {
    return H.getFloat(this.#engine, id, IMAGE_ROTATION);
  }

  rotateClockwise(id: number): void {
    const current = H.getFloat(this.#engine, id, IMAGE_ROTATION);
    const newAngle = normalizeRotation(current + 90);
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, IMAGE_ROTATION, newAngle);
    const blockType = this.#engine.getBlockStore().getType(id);
    if (blockType === "page") {
      const pageW = H.getFloat(this.#engine, id, PAGE_WIDTH);
      const pageH = H.getFloat(this.#engine, id, PAGE_HEIGHT);
      H.setFloat(this.#engine, id, PAGE_WIDTH, pageH);
      H.setFloat(this.#engine, id, PAGE_HEIGHT, pageW);
    }
    this.#engine.endBatch();
  }

  rotateCounterClockwise(id: number): void {
    const current = H.getFloat(this.#engine, id, IMAGE_ROTATION);
    const newAngle = normalizeRotation(current - 90);
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, IMAGE_ROTATION, newAngle);
    const blockType = this.#engine.getBlockStore().getType(id);
    if (blockType === "page") {
      const pageW = H.getFloat(this.#engine, id, PAGE_WIDTH);
      const pageH = H.getFloat(this.#engine, id, PAGE_HEIGHT);
      H.setFloat(this.#engine, id, PAGE_WIDTH, pageH);
      H.setFloat(this.#engine, id, PAGE_HEIGHT, pageW);
    }
    this.#engine.endBatch();
  }

  resetRotationAndFlip(id: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, IMAGE_ROTATION, 0);
    H.setBool(this.#engine, id, CROP_FLIP_HORIZONTAL, false);
    H.setBool(this.#engine, id, CROP_FLIP_VERTICAL, false);
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
}
