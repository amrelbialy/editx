import type { EngineCore } from "../engine-core";
import type { Color, GradientStop, StrokeGradient } from "./block.types";
import * as H from "./block-api-helpers";
import {
  STROKE_COLOR,
  STROKE_ENABLED,
  STROKE_GRADIENT_ANGLE,
  STROKE_GRADIENT_ENABLED,
  STROKE_GRADIENT_STOPS,
  STROKE_WIDTH,
} from "./property-keys";

/** Stroke convenience — enable/disable, color, width on graphic blocks. */
export class BlockStrokeAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  supportsStroke(blockId: number): boolean {
    const type = this.#engine._getBlockStore().getType(blockId);
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

  setStrokeGradient(blockId: number, gradient: StrokeGradient | null): void {
    const store = this.#engine._getBlockStore();
    if (store.getType(blockId) !== "graphic") return;

    this.#engine.beginBatch();
    H.setBool(this.#engine, blockId, STROKE_GRADIENT_ENABLED, gradient != null);
    if (gradient) {
      H.setFloat(this.#engine, blockId, STROKE_GRADIENT_ANGLE, gradient.angle);
      H.setProperty(
        this.#engine,
        blockId,
        STROKE_GRADIENT_STOPS,
        gradient.stops.map((stop) => ({ offset: stop.offset, color: stop.color })),
      );
    }
    this.#engine.endBatch();
  }

  getStrokeGradient(blockId: number): StrokeGradient | null {
    const store = this.#engine._getBlockStore();
    if (store.getType(blockId) !== "graphic") return null;
    if (!store.getBool(blockId, STROKE_GRADIENT_ENABLED)) return null;

    const rawStops = store.getProperty(blockId, STROKE_GRADIENT_STOPS);
    const stops = Array.isArray(rawStops)
      ? (rawStops as GradientStop[]).map((stop) => ({
          offset: stop.offset,
          color: stop.color,
        }))
      : [];
    return {
      type: "linear",
      angle: store.getFloat(blockId, STROKE_GRADIENT_ANGLE),
      stops,
    };
  }
}
