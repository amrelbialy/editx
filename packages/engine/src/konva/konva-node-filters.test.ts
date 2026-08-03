/**
 * @vitest-environment happy-dom
 *
 * Memoization / dirty-check behaviour of applyFilters (CPU fallback path,
 * webgl = null) plus disabled-effect handling. We drive a minimal Konva.Image
 * double that records cache()/clearCache()/filters() calls so we can assert the
 * pipeline is skipped on a cache hit and re-run only when adjustments, preset,
 * or the source image actually change.
 */

import type Konva from "konva";
import { describe, expect, it } from "vitest";
import type { BlockData } from "../block/block.types";
import {
  EFFECT_ADJUSTMENTS_BRIGHTNESS,
  EFFECT_ENABLED,
  EFFECT_FILTER_NAME,
} from "../block/property-keys";
import {
  applyFilters,
  collectAdjustmentValues,
  collectFilterPresetName,
} from "./konva-node-filters";

interface FakeImage {
  node: Konva.Image;
  cacheCalls: () => number;
  clearCacheCalls: () => number;
}

/** Minimal Konva.Image double covering the surface applyFilters touches. */
function makeImageNode(source: HTMLImageElement): FakeImage {
  const attrs = new Map<string, unknown>();
  attrs.set("_sourceImage", source);
  let filters: Konva.Filter[] = [];
  let image: unknown = source;
  let cacheCount = 0;
  let clearCount = 0;

  const node = {
    getAttr: (k: string) => attrs.get(k),
    setAttr: (k: string, v: unknown) => {
      attrs.set(k, v);
    },
    filters: (v?: Konva.Filter[]) => {
      if (v === undefined) return filters;
      filters = v;
      return undefined;
    },
    image: (v?: unknown) => {
      if (v === undefined) return image;
      image = v;
      return undefined;
    },
    cache: () => {
      cacheCount++;
    },
    clearCache: () => {
      clearCount++;
    },
    getStage: () => ({}) as Konva.Stage,
  } as unknown as Konva.Image;

  return {
    node,
    cacheCalls: () => cacheCount,
    clearCacheCalls: () => clearCount,
  };
}

let nextId = 1;
function block(kind: string, properties: Record<string, unknown>): BlockData {
  return {
    id: nextId++,
    type: kind === "image" ? "image" : "effect",
    kind,
    name: kind,
    effectIds: [],
    fillId: null,
    properties: properties as BlockData["properties"],
  };
}

/** Build an image block wired to the given effect blocks + a resolver. */
function scene(effects: BlockData[]): {
  imageBlock: BlockData;
  resolve: (id: number) => BlockData | undefined;
} {
  const imageBlock = block("image", {});
  imageBlock.effectIds = effects.map((e) => e.id);
  const byId = new Map(effects.map((e) => [e.id, e]));
  return { imageBlock, resolve: (id) => byId.get(id) };
}

const fakeSrc = () => ({ naturalWidth: 4, naturalHeight: 4 }) as unknown as HTMLImageElement;

describe("collectAdjustmentValues / disabled effects", () => {
  it("collects values from an enabled adjustments effect", () => {
    const adj = block("adjustments", { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3 });
    const { imageBlock, resolve } = scene([adj]);
    const values = collectAdjustmentValues(imageBlock, resolve);
    expect(values?.brightness).toBe(0.3);
  });

  it("excludes a disabled adjustments effect (effect/enabled = false)", () => {
    const adj = block("adjustments", {
      [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3,
      [EFFECT_ENABLED]: false,
    });
    const { imageBlock, resolve } = scene([adj]);
    expect(collectAdjustmentValues(imageBlock, resolve)).toBeNull();
  });

  it("excludes a disabled filter effect from the preset name", () => {
    const filter = block("filter", { [EFFECT_FILTER_NAME]: "Sepia", [EFFECT_ENABLED]: false });
    const { imageBlock, resolve } = scene([filter]);
    expect(collectFilterPresetName(imageBlock, resolve)).toBe("");
  });

  it("treats a missing effect/enabled as enabled (defaults true)", () => {
    const filter = block("filter", { [EFFECT_FILTER_NAME]: "Sepia" });
    const { imageBlock, resolve } = scene([filter]);
    expect(collectFilterPresetName(imageBlock, resolve)).toBe("Sepia");
  });
});

describe("applyFilters memoization (CPU fallback)", () => {
  it("skips re-filtering on identical adjustments + preset + source (cache hit)", () => {
    const adj = block("adjustments", { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3 });
    const { imageBlock, resolve } = scene([adj]);
    const img = makeImageNode(fakeSrc());

    applyFilters(img.node, imageBlock, null, null, resolve);
    const afterFirst = img.cacheCalls();
    expect(afterFirst).toBe(1); // applied once

    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(1); // cache hit → NOT re-applied
  });

  it("re-filters when an adjustment value changes", () => {
    const adj = block("adjustments", { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3 });
    const { imageBlock, resolve } = scene([adj]);
    const img = makeImageNode(fakeSrc());

    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(1);

    adj.properties[EFFECT_ADJUSTMENTS_BRIGHTNESS] = 0.6; // change
    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(2);
  });

  it("re-filters when the preset changes", () => {
    const filter = block("filter", { [EFFECT_FILTER_NAME]: "Sepia" });
    const { imageBlock, resolve } = scene([filter]);
    const img = makeImageNode(fakeSrc());

    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(1);

    filter.properties[EFFECT_FILTER_NAME] = "Invert";
    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(2);
  });

  it("re-filters when the source image changes", () => {
    const adj = block("adjustments", { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3 });
    const { imageBlock, resolve } = scene([adj]);
    const img = makeImageNode(fakeSrc());

    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(1);

    // Swap the underlying source image (new load) → cache must invalidate.
    const newSrc = fakeSrc();
    img.node.setAttr("_sourceImage", newSrc);
    img.node.image(newSrc);
    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(2);
  });

  it("does not spuriously re-filter when a disabled effect is present", () => {
    const disabled = block("adjustments", {
      [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.9,
      [EFFECT_ENABLED]: false,
    });
    const { imageBlock, resolve } = scene([disabled]);
    const img = makeImageNode(fakeSrc());

    // No effective filters → nothing cached, and a second call stays a no-op.
    applyFilters(img.node, imageBlock, null, null, resolve);
    const c1 = img.cacheCalls();
    applyFilters(img.node, imageBlock, null, null, resolve);
    expect(img.cacheCalls()).toBe(c1);
    expect(c1).toBe(0); // disabled effect never triggers a filter pass
  });
});
