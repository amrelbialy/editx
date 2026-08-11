/**
 * @vitest-environment happy-dom
 *
 * Fresh-load race + redraw behaviour for updateImageNode.
 *
 * - loadImage is mocked with manually-resolvable deferreds so we control async
 *   ordering.
 * - The REAL applyFilters runs (webgl = null → CPU fallback), so cache() call
 *   counts reflect actual end-to-end filtering/redraw work.
 */

import type Konva from "konva";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "../block/block.types";
import { EFFECT_ADJUSTMENTS_BRIGHTNESS, IMAGE_SRC } from "../block/property-keys";
import { updateImageNode } from "./konva-image-updater";

const { loadImageMock } = vi.hoisted(() => ({ loadImageMock: vi.fn() }));
vi.mock("../utils/image-loader", () => ({ loadImage: loadImageMock }));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}
function defer<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const htmlImg = () => ({ naturalWidth: 4, naturalHeight: 4 }) as unknown as HTMLImageElement;

interface FakeNode {
  node: Konva.Image;
  cacheCalls: () => number;
  getImage: () => unknown;
  getAttr: (k: string) => unknown;
}

function makeImageNode(hasStage = true): FakeNode {
  const attrs = new Map<string, unknown>();
  let filters: Konva.Filter[] = [];
  let image: unknown;
  let cacheCount = 0;
  const noop = () => undefined;

  const node = {
    width: noop,
    height: noop,
    crop: noop,
    scaleX: noop,
    scaleY: noop,
    offsetX: noop,
    offsetY: noop,
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
    clearCache: noop,
    getStage: () => (hasStage ? ({} as Konva.Stage) : null),
  } as unknown as Konva.Image;

  return {
    node,
    cacheCalls: () => cacheCount,
    getImage: () => image,
    getAttr: (k) => attrs.get(k),
  };
}

let nextId = 1;
function imageBlockWithAdjustment(): {
  block: BlockData;
  resolve: (id: number) => BlockData | undefined;
} {
  const adj: BlockData = {
    id: nextId++,
    type: "effect",
    kind: "adjustments",
    name: "adj",
    effectIds: [],
    fillId: null,
    properties: { [EFFECT_ADJUSTMENTS_BRIGHTNESS]: 0.3 },
  };
  const block: BlockData = {
    id: nextId++,
    type: "image",
    kind: "image",
    name: "img",
    effectIds: [adj.id],
    fillId: null,
    properties: {},
  };
  return { block, resolve: (id) => (id === adj.id ? adj : undefined) };
}

const fakeStage = { batchDraw: vi.fn() } as unknown as Konva.Stage;

beforeEach(() => {
  loadImageMock.mockReset();
});

describe("updateImageNode fresh-load path", () => {
  it("applies filters AFTER the async load resolves, not before", async () => {
    const d = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(d.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode();

    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);

    // Load hasn't resolved: synchronous filtering was skipped (no source yet).
    expect(fake.cacheCalls()).toBe(0);
    expect(fake.getAttr("_sourceImage")).toBeUndefined();

    const img = htmlImg();
    d.resolve(img);
    await d.promise;
    await Promise.resolve(); // flush the .then chain

    expect(fake.getAttr("_sourceImage")).toBe(img);
    expect(fake.getImage()).toBe(img);
    expect(fake.cacheCalls()).toBe(1); // filtered exactly once, post-load
  });

  it("does not clobber the node when a stale (superseded) load resolves", async () => {
    const dA = defer<HTMLImageElement>();
    const dB = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(dA.promise).mockReturnValueOnce(dB.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode();

    // Rapid src change A -> B before either load resolves.
    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    updateImageNode(fake.node, { [IMAGE_SRC]: "b.png" }, 4, 4, fakeStage, null, block, resolve);
    expect(fake.getAttr("__pendingSrc")).toBe("b.png");

    // Stale load A resolves first → must be ignored (guarded by __pendingSrc).
    const imgA = htmlImg();
    dA.resolve(imgA);
    await dA.promise;
    await Promise.resolve();

    expect(fake.getImage()).not.toBe(imgA);
    expect(fake.getAttr("_sourceImage")).not.toBe(imgA);
    expect(fake.cacheCalls()).toBe(0); // stale load did not filter

    // Newest load B resolves → wins.
    const imgB = htmlImg();
    dB.resolve(imgB);
    await dB.promise;
    await Promise.resolve();

    expect(fake.getImage()).toBe(imgB);
    expect(fake.getAttr("_sourceImage")).toBe(imgB);
    expect(fake.cacheCalls()).toBe(1);
  });

  it("bails in the callback if the node was detached from the stage", async () => {
    const d = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(d.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode(false); // getStage() === null

    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    d.resolve(htmlImg());
    await d.promise;
    await Promise.resolve();

    // Detached node → callback bails before touching image/filters.
    expect(fake.getImage()).toBeUndefined();
    expect(fake.cacheCalls()).toBe(0);
  });
});

describe("updateImageNode redraw memoization", () => {
  it("does not re-filter on repeated syncs with unchanged filter state", async () => {
    const d = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(d.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode();

    // First sync triggers the load; resolve it so the source + filter land.
    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    d.resolve(htmlImg());
    await d.promise;
    await Promise.resolve();
    expect(fake.cacheCalls()).toBe(1);

    // Subsequent syncs with the SAME src (already loaded) + SAME block must hit
    // the applyFilters cache and perform no additional cache()/redraw work.
    for (let i = 0; i < 3; i++) {
      updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    }
    expect(fake.cacheCalls()).toBe(1); // bounded — memoized, no redundant work
  });
});

describe("updateImageNode load-failure recovery", () => {
  /** Flush microtasks + one macrotask so unhandledRejection would surface. */
  async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }

  it("handles the rejection, clears loadedSrc, and allows a retry", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (r: unknown): void => {
      unhandled.push(r);
    };
    process.on("unhandledRejection", onUnhandled);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const dFail = defer<HTMLImageElement>();
    const dRetry = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(dFail.promise).mockReturnValueOnce(dRetry.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode();

    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    expect(fake.getAttr("loadedSrc")).toBe("a.png");

    dFail.reject(new Error("network down"));
    await flush();

    // (a) fully handled — no unhandled rejection escaped the promise chain.
    expect(unhandled).toHaveLength(0);
    // (b) loadedSrc cleared so the node isn't stuck as "already loaded".
    expect(fake.getAttr("loadedSrc")).toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load image"),
      expect.anything(),
    );
    expect(fake.cacheCalls()).toBe(0);

    // (c) same src again → srcChanged is true again → loadImage re-invoked.
    expect(loadImageMock).toHaveBeenCalledTimes(1);
    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    expect(loadImageMock).toHaveBeenCalledTimes(2);
    expect(fake.getAttr("loadedSrc")).toBe("a.png");

    const img = htmlImg();
    dRetry.resolve(img);
    await flush();
    expect(fake.getImage()).toBe(img);
    expect(fake.cacheCalls()).toBe(1);

    process.off("unhandledRejection", onUnhandled);
    errSpy.mockRestore();
  });

  it("does not clear loadedSrc when a superseded (stale) load fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const dA = defer<HTMLImageElement>();
    const dB = defer<HTMLImageElement>();
    loadImageMock.mockReturnValueOnce(dA.promise).mockReturnValueOnce(dB.promise);
    const { block, resolve } = imageBlockWithAdjustment();
    const fake = makeImageNode();

    // Rapid A -> B; __pendingSrc + loadedSrc now track "b.png".
    updateImageNode(fake.node, { [IMAGE_SRC]: "a.png" }, 4, 4, fakeStage, null, block, resolve);
    updateImageNode(fake.node, { [IMAGE_SRC]: "b.png" }, 4, 4, fakeStage, null, block, resolve);
    expect(fake.getAttr("loadedSrc")).toBe("b.png");
    expect(fake.getAttr("__pendingSrc")).toBe("b.png");

    // The OLD (stale) load fails: it must NOT clear the newer load's marker
    // and must NOT log, because it bails on the __pendingSrc guard.
    dA.reject(new Error("stale failure"));
    await flush();
    expect(fake.getAttr("loadedSrc")).toBe("b.png"); // preserved for the B load
    expect(errSpy).not.toHaveBeenCalled();

    // B still resolves normally afterward.
    const imgB = htmlImg();
    dB.resolve(imgB);
    await flush();
    expect(fake.getImage()).toBe(imgB);

    errSpy.mockRestore();
  });
});
