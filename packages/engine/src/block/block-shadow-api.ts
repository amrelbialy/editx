import type { Engine } from "../engine";
import type { Color } from "./block.types";
import * as H from "./block-api-helpers";
import {
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
} from "./property-keys";

/** Shadow convenience — enable/disable, color, offset, blur on graphic blocks. */
export class BlockShadowAPI {
  #engine: Engine;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  setShadowEnabled(blockId: number, enabled: boolean): void {
    H.setBool(this.#engine, blockId, SHADOW_ENABLED, enabled);
  }

  isShadowEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, SHADOW_ENABLED);
  }

  setShadowColor(blockId: number, color: Color): void {
    H.setColor(this.#engine, blockId, SHADOW_COLOR, color);
  }

  getShadowColor(blockId: number): Color {
    return H.getColor(this.#engine, blockId, SHADOW_COLOR);
  }

  setShadowOffsetX(blockId: number, value: number): void {
    H.setFloat(this.#engine, blockId, SHADOW_OFFSET_X, value);
  }

  getShadowOffsetX(blockId: number): number {
    return H.getFloat(this.#engine, blockId, SHADOW_OFFSET_X);
  }

  setShadowOffsetY(blockId: number, value: number): void {
    H.setFloat(this.#engine, blockId, SHADOW_OFFSET_Y, value);
  }

  getShadowOffsetY(blockId: number): number {
    return H.getFloat(this.#engine, blockId, SHADOW_OFFSET_Y);
  }

  setShadowBlur(blockId: number, value: number): void {
    H.setFloat(this.#engine, blockId, SHADOW_BLUR, value);
  }

  getShadowBlur(blockId: number): number {
    return H.getFloat(this.#engine, blockId, SHADOW_BLUR);
  }
}
