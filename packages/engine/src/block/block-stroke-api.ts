import type { EngineCore } from "../engine-core";
import type { Color } from "./block.types";
import * as H from "./block-api-helpers";
import { STROKE_COLOR, STROKE_ENABLED, STROKE_WIDTH } from "./property-keys";

/** Stroke convenience — enable/disable, color, width on graphic blocks. */
export class BlockStrokeAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  supportsStroke(blockId: number): boolean {
    const type = this.#engine.getBlockStore().getType(blockId);
    return type === "graphic" || type === "text";
  }

  setStrokeEnabled(blockId: number, enabled: boolean): void {
    H.setBool(this.#engine, blockId, STROKE_ENABLED, enabled);
  }

  isStrokeEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, STROKE_ENABLED);
  }

  setStrokeColor(blockId: number, color: Color): void {
    H.setColor(this.#engine, blockId, STROKE_COLOR, color);
  }

  getStrokeColor(blockId: number): Color {
    return H.getColor(this.#engine, blockId, STROKE_COLOR);
  }

  setStrokeWidth(blockId: number, width: number): void {
    H.setFloat(this.#engine, blockId, STROKE_WIDTH, width);
  }

  getStrokeWidth(blockId: number): number {
    return H.getFloat(this.#engine, blockId, STROKE_WIDTH);
  }
}
