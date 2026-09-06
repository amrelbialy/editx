import type { EditxEngine, TextRun } from "@editx/engine";
import { describe, expect, it, vi } from "vitest";
import { readTextState } from "./state-readers";

function makeEngine(runs: TextRun[], align = "left") {
  const block = {
    getTextRuns: vi.fn(() => runs),
    getString: vi.fn(() => align),
    getOpacity: vi.fn(() => 1),
  };
  return { block } as unknown as EditxEngine;
}

describe("readTextState — font reflects the run", () => {
  it("returns the first run's fontFamily (preset fonts included)", () => {
    const engine = makeEngine([{ text: "Chapter", style: { fontFamily: "Georgia" } }]);
    expect(readTextState(engine, 1).fontFamily).toBe("Georgia");
  });

  it("returns the fontFamily of the run under the selection start", () => {
    const engine = makeEngine([
      { text: "AB", style: { fontFamily: "Georgia" } },
      { text: "CD", style: { fontFamily: "Courier New" } },
    ]);
    // Offset 3 falls inside the second run.
    expect(readTextState(engine, 1, 3).fontFamily).toBe("Courier New");
  });

  it("falls back to Arial when the run omits a fontFamily", () => {
    const engine = makeEngine([{ text: "x", style: {} }]);
    expect(readTextState(engine, 1).fontFamily).toBe("Arial");
  });
});
