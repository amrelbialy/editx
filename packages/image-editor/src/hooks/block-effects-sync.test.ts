import { ADJUSTMENT_PARAMS, type EditxEngine } from "@editx/engine";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ADJUSTMENTS, type EffectRefs, syncFromEngine } from "./block-effects-sync";

function makeRefs(): EffectRefs {
  return {
    adjust: { current: null } as React.RefObject<number | null>,
    filter: { current: null } as React.RefObject<number | null>,
  };
}

function makeSetters() {
  return {
    setAdjustValues: vi.fn(),
    setActiveFilter: vi.fn(),
  };
}

describe("syncFromEngine", () => {
  it("maps adjustment + filter effects into refs and state", () => {
    const block = {
      getEffects: vi.fn().mockReturnValue([10, 20]),
      getKind: vi.fn((id: number) => (id === 10 ? "adjustments" : "filter")),
      getAdjustmentValue: vi.fn().mockReturnValue(0.42),
      getString: vi.fn().mockReturnValue("vintage"),
    };
    const engine = { block } as unknown as EditxEngine;
    const refs = makeRefs();
    const setters = makeSetters();

    syncFromEngine(engine, 5, refs, setters);

    expect(refs.adjust.current).toBe(10);
    expect(refs.filter.current).toBe(20);

    // Every adjustment param is read from the engine and pushed into state.
    const pushed = setters.setAdjustValues.mock.calls[0][0];
    for (const param of ADJUSTMENT_PARAMS) {
      expect(pushed[param]).toBe(0.42);
    }
    expect(setters.setActiveFilter).toHaveBeenCalledWith("vintage");
  });

  it("resets to defaults when the block has no matching effects", () => {
    const block = {
      getEffects: vi.fn().mockReturnValue([]),
      getKind: vi.fn().mockReturnValue(""),
      getAdjustmentValue: vi.fn().mockReturnValue(0),
      getString: vi.fn().mockReturnValue(""),
    };
    const engine = { block } as unknown as EditxEngine;
    const refs = makeRefs();
    refs.adjust.current = 99;
    refs.filter.current = 88;
    const setters = makeSetters();

    syncFromEngine(engine, 5, refs, setters);

    expect(refs.adjust.current).toBeNull();
    expect(refs.filter.current).toBeNull();
    expect(setters.setAdjustValues).toHaveBeenCalledWith(DEFAULT_ADJUSTMENTS);
    expect(setters.setActiveFilter).toHaveBeenCalledWith("");
  });
});
