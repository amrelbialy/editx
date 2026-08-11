import type { EngineCore } from "../engine-core";
import type {
  PropertyValue,
  TextBackground,
  TextBackgroundOptions,
  TextBackgroundPadding,
} from "./block.types";
import * as H from "./block-api-helpers";
import {
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
} from "./property-keys";

const PADDING_KEYS: Record<keyof TextBackgroundPadding, string> = {
  top: TEXT_BACKGROUND_PADDING_TOP,
  right: TEXT_BACKGROUND_PADDING_RIGHT,
  bottom: TEXT_BACKGROUND_PADDING_BOTTOM,
  left: TEXT_BACKGROUND_PADDING_LEFT,
};

const PADDING_SIDES = ["top", "right", "bottom", "left"] as const;

/** Keeps NaN/Infinity out of the store (and therefore out of `saveToString`). */
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Text background box — a rounded rect painted behind the whole text block. */
export class BlockTextBackgroundAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  supportsTextBackground(blockId: number): boolean {
    return this.#engine._getBlockStore().getType(blockId) === "text";
  }

  /**
   * Writes only the supplied fields — an omitted (or `undefined`) key stays
   * unset. Empty `opts` is a no-op; otherwise all writes form one undo entry.
   */
  setTextBackground(blockId: number, opts: TextBackgroundOptions): void {
    if (!this.supportsTextBackground(blockId)) return;

    const writes: Array<[string, PropertyValue]> = [];
    if (opts.enabled !== undefined) writes.push([TEXT_BACKGROUND_ENABLED, opts.enabled]);
    if (opts.color !== undefined) writes.push([TEXT_BACKGROUND_COLOR, opts.color]);
    if (opts.cornerRadius !== undefined) {
      writes.push([TEXT_BACKGROUND_CORNER_RADIUS, Math.max(0, finite(opts.cornerRadius))]);
    }

    const padding = opts.padding;
    if (typeof padding === "number") {
      for (const side of PADDING_SIDES) writes.push([PADDING_KEYS[side], finite(padding)]);
    } else if (padding !== undefined) {
      for (const side of PADDING_SIDES) {
        const value = padding[side];
        if (value !== undefined) writes.push([PADDING_KEYS[side], finite(value)]);
      }
    }

    if (writes.length === 0) return;

    this.#engine.beginBatch();
    for (const [key, value] of writes) H.setProperty(this.#engine, blockId, key, value);
    this.#engine.endBatch();
  }

  /** Always fully resolved from the property-store fallbacks — never null. */
  getTextBackground(blockId: number): TextBackground {
    const engine = this.#engine;
    return {
      enabled: H.getBool(engine, blockId, TEXT_BACKGROUND_ENABLED),
      color: H.getColor(engine, blockId, TEXT_BACKGROUND_COLOR),
      cornerRadius: H.getFloat(engine, blockId, TEXT_BACKGROUND_CORNER_RADIUS),
      padding: {
        top: H.getFloat(engine, blockId, TEXT_BACKGROUND_PADDING_TOP),
        right: H.getFloat(engine, blockId, TEXT_BACKGROUND_PADDING_RIGHT),
        bottom: H.getFloat(engine, blockId, TEXT_BACKGROUND_PADDING_BOTTOM),
        left: H.getFloat(engine, blockId, TEXT_BACKGROUND_PADDING_LEFT),
      },
    };
  }

  setTextBackgroundEnabled(blockId: number, enabled: boolean): void {
    this.setTextBackground(blockId, { enabled });
  }

  isTextBackgroundEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, TEXT_BACKGROUND_ENABLED);
  }
}
