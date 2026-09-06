import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ColorPropertyPanel } from "./color-property-panel";

/**
 * The Color panel gains Solid / Gradient modes for TEXT runs: a run carrying
 * `fillGradient` reflects gradient mode; switching modes routes through
 * `setTextGradient(null)` / `setTextGradient(shape)`; solid edits still call
 * `setTextColor`.
 */
function makeEngine(run: Record<string, unknown>) {
  const block = {
    getTextRuns: vi.fn().mockReturnValue([{ text: "Hi", style: run }]),
    getTextContent: vi.fn().mockReturnValue("Hi"),
    setTextColor: vi.fn(),
    setTextGradient: vi.fn(),
    getOpacity: vi.fn().mockReturnValue(1),
    setOpacity: vi.fn(),
    // Unused graphic branch.
    getFill: vi.fn().mockReturnValue(null),
    getColor: vi.fn().mockReturnValue(null),
    setColor: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  };
  return engine as unknown as EditxEngine & { block: typeof block };
}

function renderPanel(engine: EditxEngine) {
  return render(
    <ImageEditorProvider>
      <ColorPropertyPanel engine={engine} blockId={7} />
    </ImageEditorProvider>,
  );
}

const GRADIENT = {
  type: "linear" as const,
  angle: 90,
  stops: [
    { offset: 0, color: "#f97316" },
    { offset: 1, color: "#ef4444" },
  ],
};

describe("ColorPropertyPanel (text gradient)", () => {
  beforeEach(() => {
    useImageEditorStore.setState({ textSelectionRange: null, editingTextBlockId: null });
  });

  afterEach(cleanup);

  it("reflects gradient mode for a run with fillGradient", () => {
    const engine = makeEngine({ fillGradient: GRADIENT });
    renderPanel(engine);

    // Gradient sub-controls are shown (linear/radial type switch).
    expect(screen.getByRole("tablist", { name: "Gradient type" })).toBeDefined();
  });

  it("switches gradient → solid via setTextGradient(null) + setTextColor", () => {
    const engine = makeEngine({ fillGradient: GRADIENT });
    renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Solid" }));

    expect(engine.block.setTextGradient).toHaveBeenCalledWith(7, 0, 2, null);
    expect(engine.block.setTextColor).toHaveBeenCalled();
  });

  it("switches solid → gradient via setTextGradient(shape)", () => {
    const engine = makeEngine({ fill: "#3b82f6" });
    renderPanel(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));

    expect(engine.block.setTextGradient).toHaveBeenCalledTimes(1);
    const [id, start, end, gradient] = engine.block.setTextGradient.mock.calls[0];
    expect(id).toBe(7);
    expect(start).toBe(0);
    expect(end).toBe(2);
    expect(gradient.type).toBe("linear");
    expect(gradient.stops).toHaveLength(2);
  });

  it("solid edits call setTextColor (and clear any gradient)", () => {
    const engine = makeEngine({ fill: "#3b82f6" });
    renderPanel(engine);

    // The solid native colour input drives setTextColor.
    const swatch = document.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(swatch, { target: { value: "#123456" } });

    expect(engine.block.setTextColor).toHaveBeenCalledWith(7, 0, 2, "#123456");
    expect(engine.block.setTextGradient).toHaveBeenCalledWith(7, 0, 2, null);
  });
});
