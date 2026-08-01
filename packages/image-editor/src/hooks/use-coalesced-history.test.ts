import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCoalescedHistory } from "./use-coalesced-history";

function makeEngine() {
  return {
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine & {
    beginBatch: ReturnType<typeof vi.fn>;
    endBatch: ReturnType<typeof vi.fn>;
    renderDirty: ReturnType<typeof vi.fn>;
  };
}

describe("useCoalescedHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses a rapid burst of mutations into a single batch", () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useCoalescedHistory(engine, 300));

    const mutate = vi.fn();
    act(() => {
      result.current.commit(mutate);
      result.current.commit(mutate);
      result.current.commit(mutate);
    });

    // One batch opened, every mutation applied + rendered live, batch still open.
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(3);
    expect(engine.renderDirty).toHaveBeenCalledTimes(3);
    expect(engine.endBatch).not.toHaveBeenCalled();

    // After the idle window the batch closes exactly once → one undo entry.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh batch for a new burst after idle", () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useCoalescedHistory(engine, 300));

    act(() => {
      result.current.commit(() => {});
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current.commit(() => {});
      vi.advanceTimersByTime(300);
    });

    expect(engine.beginBatch).toHaveBeenCalledTimes(2);
    expect(engine.endBatch).toHaveBeenCalledTimes(2);
  });

  it("flush() closes the open batch immediately", () => {
    const engine = makeEngine();
    const { result } = renderHook(() => useCoalescedHistory(engine, 300));

    act(() => {
      result.current.commit(() => {});
      result.current.flush();
    });

    expect(engine.endBatch).toHaveBeenCalledTimes(1);

    // Flushing again with no open batch is a no-op.
    act(() => {
      result.current.flush();
    });
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("closes any open batch on unmount", () => {
    const engine = makeEngine();
    const { result, unmount } = renderHook(() => useCoalescedHistory(engine, 300));

    act(() => {
      result.current.commit(() => {});
    });
    expect(engine.endBatch).not.toHaveBeenCalled();

    unmount();
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when engine is null", () => {
    const { result } = renderHook(() => useCoalescedHistory(null, 300));
    const mutate = vi.fn();
    act(() => {
      result.current.commit(mutate);
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
