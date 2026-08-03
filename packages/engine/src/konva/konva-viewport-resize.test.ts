import type Konva from "konva";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KonvaCamera } from "./konva-camera";
import { observeViewportResize, type ViewportResizeDeps } from "./konva-viewport-resize";

/**
 * WI-5: a resize must never destroy the user's zoom/pan. The container is
 * auto-fit only on the *first* valid layout; every later resize re-clamps the
 * existing viewport via {@link KonvaCamera.reapplyViewport} instead of re-fitting.
 */

/** Captures the ResizeObserver callback so tests can drive resizes manually. */
class FakeResizeObserver {
  static lastCallback: (() => void) | null = null;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(cb: () => void) {
    FakeResizeObserver.lastCallback = () => cb();
  }
}

const realResizeObserver = globalThis.ResizeObserver;

function makeDeps(overrides?: Partial<ViewportResizeDeps>) {
  const fitToScreen = vi.fn();
  const reapplyViewport = vi.fn();
  const camera = { fitToScreen, reapplyViewport } as unknown as KonvaCamera;
  const width = vi.fn();
  const height = vi.fn();
  const stage = { width, height } as unknown as Konva.Stage;
  const rootEl = { clientWidth: 800, clientHeight: 600 } as unknown as HTMLElement;
  const deps: ViewportResizeDeps = {
    rootEl,
    stage,
    camera,
    getPageSize: () => ({ width: 1080, height: 720 }),
    ...overrides,
  };
  return { deps, fitToScreen, reapplyViewport, stageWidth: width, stageHeight: height, rootEl };
}

function fireResize() {
  FakeResizeObserver.lastCallback?.();
}

describe("observeViewportResize", () => {
  beforeEach(() => {
    FakeResizeObserver.lastCallback = null;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = realResizeObserver;
  });

  it("auto-fits the page on the first valid layout", () => {
    const { deps, fitToScreen, reapplyViewport, stageWidth, stageHeight } = makeDeps();
    observeViewportResize(deps);

    fireResize();

    expect(stageWidth).toHaveBeenCalledWith(800);
    expect(stageHeight).toHaveBeenCalledWith(600);
    expect(fitToScreen).toHaveBeenCalledTimes(1);
    expect(fitToScreen).toHaveBeenCalledWith({ width: 1080, height: 720, padding: 48 });
    expect(reapplyViewport).not.toHaveBeenCalled();
  });

  it("preserves zoom/pan on subsequent resizes (reapply, never re-fit)", () => {
    const { deps, fitToScreen, reapplyViewport } = makeDeps();
    observeViewportResize(deps);

    fireResize(); // first: fit
    fireResize(); // second: preserve
    fireResize(); // third: preserve

    expect(fitToScreen).toHaveBeenCalledTimes(1);
    expect(reapplyViewport).toHaveBeenCalledTimes(2);
  });

  it("ignores zero-sized layouts and does not consume the first-fit", () => {
    const rootEl = { clientWidth: 0, clientHeight: 0 } as unknown as HTMLElement;
    const { deps, fitToScreen, reapplyViewport, stageWidth } = makeDeps({ rootEl });
    observeViewportResize(deps);

    fireResize();

    expect(stageWidth).not.toHaveBeenCalled();
    expect(fitToScreen).not.toHaveBeenCalled();
    expect(reapplyViewport).not.toHaveBeenCalled();
  });

  it("reapplies (does not fit) when no page size is available yet", () => {
    const { deps, fitToScreen, reapplyViewport } = makeDeps({ getPageSize: () => undefined });
    observeViewportResize(deps);

    fireResize();

    expect(fitToScreen).not.toHaveBeenCalled();
    expect(reapplyViewport).toHaveBeenCalledTimes(1);
  });

  it("observes the root element and returns the observer", () => {
    const { deps } = makeDeps();
    const observer = observeViewportResize(deps) as unknown as FakeResizeObserver;
    expect(observer.observe).toHaveBeenCalledWith(deps.rootEl);
  });
});
