import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBlockEffects } from "./use-block-effects";

/**
 * Minimal engine double exposing only the surface `useBlockEffects` touches.
 * `beginBatch`/`endBatch` are the focus — the regression is a leaked (never
 * closed) batch when the hook unmounts mid adjustment-drag.
 */
function makeEngine() {
  const block = {
    createEffect: vi.fn().mockReturnValue(100),
    appendEffect: vi.fn(),
    removeEffect: vi.fn(),
    getEffects: vi.fn().mockReturnValue([]),
    getKind: vi.fn().mockReturnValue(""),
    getAdjustmentValue: vi.fn().mockReturnValue(0),
    setAdjustmentValue: vi.fn(),
    getString: vi.fn().mockReturnValue(""),
    setString: vi.fn(),
  };
  const engine = {
    block,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
  };
  return engine as unknown as EditxEngine & {
    block: typeof block;
    beginBatch: ReturnType<typeof vi.fn>;
    endBatch: ReturnType<typeof vi.fn>;
    renderDirty: ReturnType<typeof vi.fn>;
    onHistoryChanged: ReturnType<typeof vi.fn>;
  };
}

describe("useBlockEffects — adjustment batch lifecycle", () => {
  beforeEach(() => {
    // Keep the rAF-throttled write deterministic: never auto-fire the frame so
    // the batch stays open exactly like a real mid-drag before commit/unmount.
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn().mockReturnValue(1) as unknown as typeof requestAnimationFrame,
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn() as unknown as typeof cancelAnimationFrame);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("closes the open batch on unmount when a drag was never committed", () => {
    const engine = makeEngine();
    const engineRef = { current: engine } as React.RefObject<EditxEngine | null>;

    const { result, unmount } = renderHook(() => useBlockEffects({ engineRef, blockId: 5 }));

    // Start an adjustment drag → opens exactly one batch, not yet closed.
    act(() => {
      result.current.handleAdjustChange("brightness", 0.5);
    });
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).not.toHaveBeenCalled();

    // Unmount mid-drag (no commit) — the flush-on-unmount effect must close it.
    unmount();
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("does not double-close the batch when committed before unmount", () => {
    const engine = makeEngine();
    const engineRef = { current: engine } as React.RefObject<EditxEngine | null>;

    const { result, unmount } = renderHook(() => useBlockEffects({ engineRef, blockId: 5 }));

    act(() => {
      result.current.handleAdjustChange("contrast", 0.3);
    });
    act(() => {
      result.current.handleAdjustCommit();
    });
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).toHaveBeenCalledTimes(1);

    // Unmount afterwards must be a no-op — no leaked / double endBatch.
    unmount();
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("does not open or close a batch when no adjustment was started", () => {
    const engine = makeEngine();
    const engineRef = { current: engine } as React.RefObject<EditxEngine | null>;

    const { unmount } = renderHook(() => useBlockEffects({ engineRef, blockId: 5 }));

    // No handleAdjustChange call → nothing to flush.
    unmount();
    expect(engine.beginBatch).not.toHaveBeenCalled();
    expect(engine.endBatch).not.toHaveBeenCalled();
  });

  it("opens a single batch across multiple changes within the same drag", () => {
    const engine = makeEngine();
    const engineRef = { current: engine } as React.RefObject<EditxEngine | null>;

    const { result, unmount } = renderHook(() => useBlockEffects({ engineRef, blockId: 5 }));

    act(() => {
      result.current.handleAdjustChange("brightness", 0.1);
      result.current.handleAdjustChange("brightness", 0.2);
      result.current.handleAdjustChange("brightness", 0.3);
    });
    // Batch is opened once for the whole burst.
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);

    unmount();
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("closes the open batch on the previous block when blockId changes mid-drag", () => {
    const engine = makeEngine();
    const engineRef = { current: engine } as React.RefObject<EditxEngine | null>;

    const { result, rerender } = renderHook(
      ({ blockId }) => useBlockEffects({ engineRef, blockId }),
      { initialProps: { blockId: 5 } },
    );

    // Start an adjustment drag on block A → one open batch, not yet closed.
    act(() => {
      result.current.handleAdjustChange("brightness", 0.5);
    });
    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch).not.toHaveBeenCalled();

    // Switch to block B mid-drag → the blockId-change effect must close block
    // A's batch exactly once (not leak it, not double-close it).
    act(() => {
      rerender({ blockId: 6 });
    });
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
  });
});
