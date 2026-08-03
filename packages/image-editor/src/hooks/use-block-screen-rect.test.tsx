import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ScreenRect, useBlockScreenRect } from "./use-block-screen-rect";

/**
 * WI-7b: `useBlockScreenRect` is fully event-driven — it must never poll via
 * `requestAnimationFrame`. It recomputes only when pan/zoom/live-transform or a
 * committed block change fires, and it tears down every subscription on unmount
 * or when its dependencies change.
 */

type Cb = (...args: unknown[]) => void;

function makeEngine() {
  const listeners: Record<"pan" | "zoom" | "transform" | "event", Cb[]> = {
    pan: [],
    zoom: [],
    transform: [],
    event: [],
  };
  const unsub = {
    pan: vi.fn(),
    zoom: vi.fn(),
    transform: vi.fn(),
    event: vi.fn(),
  };
  const rects: { selected: ScreenRect | null; block: ScreenRect | null } = {
    selected: null,
    block: null,
  };

  const engine = {
    editor: {
      getSelectedBlockScreenRect: vi.fn(() => rects.selected),
      getBlockScreenRect: vi.fn(() => rects.block),
    },
    onPanChanged: vi.fn((cb: Cb) => {
      listeners.pan.push(cb);
      return unsub.pan;
    }),
    onZoomChanged: vi.fn((cb: Cb) => {
      listeners.zoom.push(cb);
      return unsub.zoom;
    }),
    onBlockTransform: vi.fn((cb: Cb) => {
      listeners.transform.push(cb);
      return unsub.transform;
    }),
    event: {
      subscribe: vi.fn((_ids: number[], cb: Cb) => {
        listeners.event.push(cb);
        return unsub.event;
      }),
    },
  };

  return { engine: engine as unknown as EditxEngine, listeners, unsub, rects };
}

describe("useBlockScreenRect", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never polls via requestAnimationFrame", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    const { engine, listeners } = makeEngine();

    const { rerender, unmount } = renderHook(() => useBlockScreenRect(engine, 1));
    act(() => {
      for (const cb of listeners.pan) cb();
      for (const cb of listeners.transform) cb({ block: 1, phase: "drag" });
    });
    rerender();
    unmount();

    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("returns null and does not subscribe when no block is selected", () => {
    const { engine } = makeEngine();
    const { result } = renderHook(() => useBlockScreenRect(engine, null));
    expect(result.current).toBeNull();
    expect(engine.onPanChanged).not.toHaveBeenCalled();
  });

  it("recomputes the rect when a pan event fires", () => {
    const { engine, listeners, rects } = makeEngine();
    const { result } = renderHook(() => useBlockScreenRect(engine, 1));
    expect(result.current).toBeNull();

    rects.selected = { x: 5, y: 6, width: 20, height: 10 };
    act(() => {
      for (const cb of listeners.pan) cb();
    });
    expect(result.current).toEqual({ x: 5, y: 6, width: 20, height: 10 });
  });

  it("recomputes on zoom, live-transform (matching block) and committed events", () => {
    const { engine, listeners, rects } = makeEngine();
    const { result } = renderHook(() => useBlockScreenRect(engine, 7));

    rects.selected = { x: 1, y: 1, width: 1, height: 1 };
    act(() => {
      for (const cb of listeners.zoom) cb(2);
    });
    expect(result.current).toEqual({ x: 1, y: 1, width: 1, height: 1 });

    rects.selected = { x: 2, y: 2, width: 2, height: 2 };
    act(() => {
      for (const cb of listeners.transform) cb({ block: 7, phase: "resize" });
    });
    expect(result.current).toEqual({ x: 2, y: 2, width: 2, height: 2 });

    rects.selected = { x: 3, y: 3, width: 3, height: 3 };
    act(() => {
      for (const cb of listeners.event) cb();
    });
    expect(result.current).toEqual({ x: 3, y: 3, width: 3, height: 3 });
  });

  it("ignores live-transform events for other blocks", () => {
    const { engine, listeners, rects } = makeEngine();
    const { result } = renderHook(() => useBlockScreenRect(engine, 7));

    rects.selected = { x: 9, y: 9, width: 9, height: 9 };
    act(() => {
      for (const cb of listeners.transform) cb({ block: 42, phase: "drag" });
    });
    // A transform for a different block must not update the tracked rect.
    expect(result.current).toBeNull();
  });

  it("falls back to the direct block rect when no transformer rect exists", () => {
    const { engine, listeners, rects } = makeEngine();
    const { result } = renderHook(() => useBlockScreenRect(engine, 3));

    rects.selected = null;
    rects.block = { x: 4, y: 4, width: 8, height: 8 };
    act(() => {
      for (const cb of listeners.pan) cb();
    });
    expect(result.current).toEqual({ x: 4, y: 4, width: 8, height: 8 });
  });

  it("unsubscribes every subscription on unmount", () => {
    const { engine, unsub } = makeEngine();
    const { unmount } = renderHook(() => useBlockScreenRect(engine, 1));

    expect(unsub.pan).not.toHaveBeenCalled();
    unmount();

    expect(unsub.pan).toHaveBeenCalledTimes(1);
    expect(unsub.zoom).toHaveBeenCalledTimes(1);
    expect(unsub.transform).toHaveBeenCalledTimes(1);
    expect(unsub.event).toHaveBeenCalledTimes(1);
  });

  it("tears down and re-subscribes when the selected block changes", () => {
    const { engine, unsub } = makeEngine();
    const { rerender } = renderHook(({ id }) => useBlockScreenRect(engine, id), {
      initialProps: { id: 1 as number | null },
    });

    rerender({ id: 2 });

    // Old subscriptions cleaned up, fresh ones registered for the new block.
    expect(unsub.pan).toHaveBeenCalledTimes(1);
    expect(engine.onPanChanged).toHaveBeenCalledTimes(2);
    expect(engine.event.subscribe).toHaveBeenLastCalledWith([2], expect.any(Function));
  });
});
