import { type EditxEngine, EFFECT_FILTER_NAME } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBlockEffects } from "./use-block-effects";

function makeEngine() {
  const kinds = new Map<number, string>();
  const strings = new Map<string, string>();
  const adjust = new Map<string, number>();
  const blockEffects: number[] = [];
  const historyListeners: Array<() => void> = [];
  let nextId = 100;

  const block = {
    getEffects: vi.fn(() => [...blockEffects]),
    getKind: vi.fn((eid: number) => kinds.get(eid) ?? ""),
    getAdjustmentValue: vi.fn((eid: number, param: string) => adjust.get(`${eid}:${param}`) ?? 0),
    getString: vi.fn((eid: number, key: string) => strings.get(`${eid}:${key}`) ?? ""),
    createEffect: vi.fn((kind: string) => {
      const id = nextId++;
      kinds.set(id, kind);
      return id;
    }),
    appendEffect: vi.fn((_blockId: number, eid: number) => {
      blockEffects.push(eid);
    }),
    setAdjustmentValue: vi.fn((eid: number, param: string, value: number) => {
      adjust.set(`${eid}:${param}`, value);
    }),
    setString: vi.fn((eid: number, key: string, value: string) => {
      strings.set(`${eid}:${key}`, value);
    }),
    removeEffect: vi.fn((_blockId: number, index: number) => {
      blockEffects.splice(index, 1);
    }),
  };

  const engine = {
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    onHistoryChanged: vi.fn((cb: () => void) => {
      historyListeners.push(cb);
      return () => {};
    }),
    block,
  } as unknown as EditxEngine;

  return {
    engine,
    block,
    seedAdjust(value: number) {
      const eid = nextId++;
      kinds.set(eid, "adjustments");
      adjust.set(`${eid}:brightness`, value);
      blockEffects.push(eid);
      return eid;
    },
    seedFilter(name: string) {
      const eid = nextId++;
      kinds.set(eid, "filter");
      strings.set(`${eid}:${EFFECT_FILTER_NAME}`, name);
      blockEffects.push(eid);
      return eid;
    },
    fireHistoryChanged() {
      for (const listener of historyListeners) listener();
    },
  };
}

const refCache = new WeakMap<object, React.RefObject<EditxEngine | null>>();
function ref(engine: EditxEngine): React.RefObject<EditxEngine | null> {
  const existing = refCache.get(engine);
  if (existing) return existing;
  const created = { current: engine };
  refCache.set(engine, created);
  return created;
}

describe("useBlockEffects behavior", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes to defaults for a block with no effects", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));

    expect(result.current.adjustValues.brightness).toBe(0);
    expect(result.current.activeFilter).toBe("");
  });

  it("syncs existing adjustment and filter effects from the block on mount", () => {
    const h = makeEngine();
    h.seedAdjust(0.4);
    h.seedFilter("vintage");

    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));

    expect(result.current.adjustValues.brightness).toBe(0.4);
    expect(result.current.activeFilter).toBe("vintage");
  });

  it("resets to defaults when blockId is null", () => {
    const h = makeEngine();
    h.seedAdjust(0.4);

    const { result } = renderHook(() =>
      useBlockEffects({ engineRef: ref(h.engine), blockId: null }),
    );

    expect(result.current.adjustValues.brightness).toBe(0);
    expect(result.current.activeFilter).toBe("");
  });

  it("handleAdjustChange updates state immediately and opens a single batch", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));

    act(() => {
      result.current.handleAdjustChange("brightness", 0.5);
    });

    expect(result.current.adjustValues.brightness).toBe(0.5);
    expect(h.block.createEffect).toHaveBeenCalledWith("adjustments");
    expect(h.engine.beginBatch).toHaveBeenCalledTimes(1);
  });

  it("handleAdjustCommit flushes the pending write and closes the batch", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));

    act(() => {
      result.current.handleAdjustChange("contrast", -0.25);
    });
    act(() => {
      result.current.handleAdjustCommit();
    });

    expect(h.block.setAdjustmentValue).toHaveBeenCalledWith(expect.any(Number), "contrast", -0.25);
    expect(h.engine.renderDirty).toHaveBeenCalled();
    expect(h.engine.endBatch).toHaveBeenCalledTimes(1);
  });

  it("handleAdjustReset removes the adjustment effect and clears state", () => {
    const h = makeEngine();
    h.seedAdjust(0.7);
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));
    expect(result.current.adjustValues.brightness).toBe(0.7);

    act(() => {
      result.current.handleAdjustReset();
    });

    expect(h.block.removeEffect).toHaveBeenCalledTimes(1);
    expect(result.current.adjustValues.brightness).toBe(0);
  });

  it("handleFilterSelect creates a filter effect and reflects the active filter", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));

    act(() => {
      result.current.handleFilterSelect("noir");
    });

    expect(h.block.createEffect).toHaveBeenCalledWith("filter");
    expect(h.block.setString).toHaveBeenCalledWith(expect.any(Number), EFFECT_FILTER_NAME, "noir");
    expect(result.current.activeFilter).toBe("noir");
  });

  it("re-syncs state when history changes", () => {
    const h = makeEngine();
    const { result } = renderHook(() => useBlockEffects({ engineRef: ref(h.engine), blockId: 1 }));
    expect(result.current.activeFilter).toBe("");

    h.seedFilter("sepia");
    act(() => {
      h.fireHistoryChanged();
    });

    expect(result.current.activeFilter).toBe("sepia");
  });

  it("is a no-op when the engine ref is empty", () => {
    const emptyRef: React.RefObject<EditxEngine | null> = { current: null };
    const { result } = renderHook(() => useBlockEffects({ engineRef: emptyRef, blockId: 1 }));

    act(() => {
      result.current.handleFilterSelect("noir");
    });

    expect(result.current.activeFilter).toBe("");
  });
});
