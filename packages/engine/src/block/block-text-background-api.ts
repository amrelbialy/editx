import type { EngineCore } from "../engine-core";
import type {
  PropertyValue,
  ResolvedTextBackground,
  TextBackgroundGeometry,
  TextBackgroundOptions,
  TextBackgroundPadding,
} from "./block.types";
import * as H from "./block-api-helpers";
import {
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_GEOMETRY,
  TEXT_BACKGROUND_PADDING_BOTTOM,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_PADDING,
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

function resolveGeometry(value: string): TextBackgroundGeometry {
  return value === "frame" ? "frame" : "text-union";
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
    if (opts.geometry !== undefined) writes.push([TEXT_BACKGROUND_GEOMETRY, opts.geometry]);
    if (opts.cornerRadius !== undefined) {
      writes.push([TEXT_BACKGROUND_CORNER_RADIUS, Math.max(0, finite(opts.cornerRadius))]);
    }

    const geometry = opts.geometry ?? this.#getGeometry(blockId);
    const normalizePadding = (value: number) => {
      const normalized = finite(value);
      return geometry === "frame" ? Math.max(0, normalized) : normalized;
    };
    const padding = opts.padding;
    if (opts.geometry === "frame") {
      for (const side of PADDING_SIDES) {
        const supplied = typeof padding === "number" ? padding : padding?.[side];
        const stored = H.getProperty(this.#engine, blockId, PADDING_KEYS[side]);
        const value =
          supplied ??
          (typeof stored === "number" ? stored : H.getFloat(this.#engine, blockId, TEXT_PADDING));
        writes.push([PADDING_KEYS[side], normalizePadding(value)]);
      }
    } else if (typeof padding === "number") {
      for (const side of PADDING_SIDES)
        writes.push([PADDING_KEYS[side], normalizePadding(padding)]);
    } else if (padding !== undefined) {
      for (const side of PADDING_SIDES) {
        const value = padding[side];
        if (value !== undefined) writes.push([PADDING_KEYS[side], normalizePadding(value)]);
      }
    }

    if (writes.length === 0) return;

    this.#engine.beginBatch();
    for (const [key, value] of writes) H.setProperty(this.#engine, blockId, key, value);
    this.#engine.endBatch();
  }

  /** Always fully resolved from the property-store fallbacks — never null. */
  getTextBackground(blockId: number): ResolvedTextBackground {
    const engine = this.#engine;
    return {
      enabled: H.getBool(engine, blockId, TEXT_BACKGROUND_ENABLED),
      color: H.getColor(engine, blockId, TEXT_BACKGROUND_COLOR),
      geometry: this.#getGeometry(blockId),
      cornerRadius: H.getFloat(engine, blockId, TEXT_BACKGROUND_CORNER_RADIUS),
      padding: this.#getPadding(blockId),
    };
  }

  setTextBackgroundEnabled(blockId: number, enabled: boolean): void {
    this.setTextBackground(blockId, { enabled });
  }

  isTextBackgroundEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, TEXT_BACKGROUND_ENABLED);
  }

  #getGeometry(blockId: number): TextBackgroundGeometry {
    return resolveGeometry(H.getString(this.#engine, blockId, TEXT_BACKGROUND_GEOMETRY));
  }

  #getPadding(blockId: number): TextBackgroundPadding {
    const geometry = this.#getGeometry(blockId);
    const read = (side: keyof TextBackgroundPadding) => {
      const value = H.getFloat(this.#engine, blockId, PADDING_KEYS[side]);
      return geometry === "frame" ? Math.max(0, value) : value;
    };
    return { top: read("top"), right: read("right"), bottom: read("bottom"), left: read("left") };
  }
}
