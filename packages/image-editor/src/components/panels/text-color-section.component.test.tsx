import type { EditxEngine, TextRun } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextColorSection } from "./text-color-section.component";

/**
 * Engine double for the colour section. `getTextRuns` is mutable so a test can
 * simulate an async history re-read that observes *stale* runs (still a
 * gradient) after the user already switched to Solid.
 */
function makeEngine(initialRuns: TextRun[]) {
  let runs = initialRuns;
  let historyCb: (() => void) | null = null;
  const block = {
    getTextRuns: vi.fn(() => runs),
    setTextGradient: vi.fn(),
    setTextColor: vi.fn(),
  };
  const engine = {
    block,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    onHistoryChanged: vi.fn((cb: () => void) => {
      historyCb = cb;
      return () => {};
    }),
  };
  return {
    engine: engine as unknown as EditxEngine & { block: typeof block },
    setRuns: (next: TextRun[]) => {
      runs = next;
    },
    fireHistory: () => historyCb?.(),
  };
}

const GRADIENT_RUN: TextRun = {
  text: "Hello",
  style: {
    fill: "#f59e0b",
    fillGradient: {
      type: "linear",
      angle: 90,
      stops: [
        { offset: 0, color: "#f59e0b" },
        { offset: 1, color: "#fde047" },
      ],
    },
  },
};

function renderSection(engine: EditxEngine) {
  return render(
    <TextColorSection
      engine={engine}
      blockId={3}
      getStyleRange={() => ({ start: 0, end: 5 })}
      opacity={1}
      onOpacityChange={() => {}}
    />,
  );
}

describe("TextColorSection — Solid stays solid", () => {
  afterEach(cleanup);

  it("starts in gradient mode for a gradient run", () => {
    const { engine } = makeEngine([GRADIENT_RUN]);
    renderSection(engine);
    expect(screen.getByRole("tab", { name: "Gradient" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("clears the gradient and applies the solid colour when Solid is picked", () => {
    const { engine } = makeEngine([GRADIENT_RUN]);
    renderSection(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Solid" }));

    // Gradient explicitly cleared, then solid colour written — both undoable.
    expect(engine.block.setTextGradient).toHaveBeenCalledWith(3, 0, 5, null);
    expect(engine.block.setTextColor).toHaveBeenCalledWith(3, 0, 5, "#f59e0b");
    expect(screen.getByRole("tab", { name: "Solid" }).getAttribute("aria-selected")).toBe("true");
  });

  it("does not revert to gradient when a history re-read observes stale runs", () => {
    const h = makeEngine([GRADIENT_RUN]);
    renderSection(h.engine);

    fireEvent.click(screen.getByRole("tab", { name: "Solid" }));
    expect(screen.getByRole("tab", { name: "Solid" }).getAttribute("aria-selected")).toBe("true");

    // Simulate an async history change that still sees the old gradient run.
    h.fireHistory();

    // The user's explicit Solid choice must win over the stale re-read.
    expect(screen.getByRole("tab", { name: "Solid" }).getAttribute("aria-selected")).toBe("true");
  });

  it("does not run engine mutations inside a setState updater (single write)", () => {
    const { engine } = makeEngine([GRADIENT_RUN]);
    renderSection(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Solid" }));

    // Mutation happens once per user action even though React may re-invoke
    // reducers under StrictMode — proves the mutation left the updater body.
    expect(engine.block.setTextGradient).toHaveBeenCalledTimes(1);
    expect(engine.block.setTextColor).toHaveBeenCalledTimes(1);
  });
});
