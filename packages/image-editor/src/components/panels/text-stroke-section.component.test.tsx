import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextStrokeSection } from "./text-stroke-section.component";

function makeEngine() {
  const onHistoryChanged = vi.fn().mockReturnValue(() => undefined);
  const block = {
    getTextRuns: vi.fn().mockReturnValue([
      { text: "A", style: { textStrokeColor: "#111111", textStrokeWidth: 2 } },
      { text: "BC", style: { textStrokeColor: "#336699", textStrokeWidth: 3 } },
    ]),
    setTextStroke: vi.fn(),
  };
  return {
    engine: {
      block,
      onHistoryChanged,
      beginBatch: vi.fn(),
      endBatch: vi.fn(),
      renderDirty: vi.fn(),
    } as unknown as EditxEngine,
    block,
    notifyHistory: () => {
      const listener = onHistoryChanged.mock.calls.at(-1)?.[0] as (() => void) | undefined;
      listener?.();
    },
  };
}

describe("TextStrokeSection gradient", () => {
  afterEach(cleanup);

  it("applies mode and gradient mutations to the selected range", () => {
    const { engine, block } = makeEngine();
    const { container } = render(
      <TextStrokeSection
        engine={engine}
        blockId={7}
        getStyleRange={() => ({ start: 1, end: 3 })}
        selectionStart={1}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));
    expect(block.setTextStroke).toHaveBeenCalledWith(7, 1, 3, {
      gradient: {
        type: "linear",
        angle: 0,
        stops: [
          { offset: 0, color: "#336699" },
          { offset: 1, color: "#000000" },
        ],
      },
      width: 3,
    });

    fireEvent.change(container.querySelector('input[type="number"]') as HTMLInputElement, {
      target: { value: "90" },
    });
    const colors = container.querySelectorAll<HTMLInputElement>('input[type="color"]');
    fireEvent.change(colors[0], { target: { value: "#ff0000" } });

    expect(block.setTextStroke).toHaveBeenLastCalledWith(7, 1, 3, {
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#000000" },
        ],
      },
      width: 3,
    });
    expect(engine.beginBatch).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    expect(block.setTextStroke).toHaveBeenLastCalledWith(7, 1, 3, { gradient: null });
  });

  it("keeps Color selected while history still reports the previous gradient", () => {
    const { engine, block, notifyHistory } = makeEngine();
    block.getTextRuns.mockReturnValue([
      {
        text: "ABC",
        style: {
          textStrokeColor: "#336699",
          textStrokeWidth: 3,
          textStrokeGradient: {
            type: "linear",
            angle: 0,
            stops: [
              { offset: 0, color: "#336699" },
              { offset: 1, color: "#000000" },
            ],
          },
        },
      },
    ]);
    render(
      <TextStrokeSection
        engine={engine}
        blockId={7}
        getStyleRange={() => ({ start: 0, end: 3 })}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    notifyHistory();

    expect(screen.getByRole("tab", { name: "Color" }).getAttribute("aria-selected")).toBe("true");
  });

  it("restores gradient stops, opacity, and width after visiting Color", () => {
    const { engine, block, notifyHistory } = makeEngine();
    block.getTextRuns.mockReturnValue([
      {
        text: "ABC",
        style: {
          textStrokeColor: "#336699",
          textStrokeWidth: 0,
          textStrokeGradient: {
            type: "linear",
            angle: 35,
            stops: [
              { offset: 0, color: "#ff000066" },
              { offset: 1, color: "#00ff0066" },
            ],
          },
        },
      },
    ]);
    render(
      <TextStrokeSection
        engine={engine}
        blockId={7}
        getStyleRange={() => ({ start: 0, end: 3 })}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Color" }));
    block.getTextRuns.mockReturnValue([
      { text: "ABC", style: { textStrokeColor: "#336699", textStrokeWidth: 0 } },
    ]);
    notifyHistory();
    fireEvent.click(screen.getByRole("tab", { name: "Gradient" }));

    expect(block.setTextStroke).toHaveBeenLastCalledWith(7, 0, 3, {
      gradient: {
        type: "linear",
        angle: 35,
        stops: [
          { offset: 0, color: "rgba(255,0,0,0.4)" },
          { offset: 1, color: "rgba(0,255,0,0.4)" },
        ],
      },
      width: 0,
    });
  });
});
