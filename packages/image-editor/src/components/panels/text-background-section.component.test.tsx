import type { EditxEngine, TextBackground, TextCurve } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TextBackgroundSection } from "./text-background-section.component";

const RESOLVED_BOX: TextBackground = {
  enabled: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  geometry: "text-union",
  cornerRadius: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
};

interface EngineOptions {
  supportsBox?: boolean;
  box?: Partial<TextBackground>;
  curve?: TextCurve | null;
}

function makeEngine(options: EngineOptions = {}) {
  const { supportsBox = true, box, curve = null } = options;
  const blockApi = {
    getTextRuns: vi.fn().mockReturnValue([{ text: "Hello", style: {} }]),
    setTextBackgroundColor: vi.fn(),
    setTextBackgroundOpacity: vi.fn(),
    setTextBackgroundCornerRadius: vi.fn(),
    setTextBackgroundPadding: vi.fn(),
    supportsTextBackground: vi.fn().mockReturnValue(supportsBox),
    getTextBackground: vi.fn().mockReturnValue({ ...RESOLVED_BOX, ...box }),
    setTextBackground: vi.fn(),
    setTextBackgroundEnabled: vi.fn(),
    getTextCurve: vi.fn().mockReturnValue(curve),
  };
  const engine = {
    block: blockApi,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  };
  return engine as unknown as EditxEngine & { block: typeof blockApi } & Pick<
      typeof engine,
      "beginBatch" | "endBatch"
    >;
}

function section(engine: EditxEngine, blockId = 7) {
  return (
    <I18nProvider>
      <TextBackgroundSection
        engine={engine}
        blockId={blockId}
        getStyleRange={() => ({ start: 0, end: 5 })}
      />
    </I18nProvider>
  );
}

function renderSection(engine: EditxEngine, blockId = 7) {
  return render(section(engine, blockId));
}

function colorInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="color"]');
  if (!input) throw new Error("box colour input not rendered");
  return input;
}
describe("TextBackgroundSection", () => {
  afterEach(cleanup);

  it("hides the box group when the block does not support a text background", () => {
    const engine = makeEngine({ supportsBox: false });
    renderSection(engine);

    expect(screen.queryByRole("switch", { name: "Enable Frame" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    expect(screen.getByRole("switch", { name: "Enable Background" })).toBeTruthy();
  });

  it("keeps the per-run highlight on the range-based setter", () => {
    const engine = makeEngine();
    renderSection(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));

    expect(engine.block.setTextBackgroundColor).toHaveBeenCalledWith(7, 0, 5, "#FDE68A");
    expect(engine.block.setTextBackgroundEnabled).not.toHaveBeenCalled();
  });

  it("shows zero padding when the highlight geometry is unset", () => {
    const engine = makeEngine();
    renderSection(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    fireEvent.click(screen.getByRole("switch", { name: "Enable Background" }));

    expect(screen.getByLabelText("All")).toHaveValue(0);
  });

  it("enables the Frame and authors its geometry atomically", () => {
    const engine = makeEngine();
    renderSection(engine);

    fireEvent.click(screen.getByRole("switch", { name: "Enable Frame" }));

    expect(engine.block.setTextBackground).toHaveBeenCalledWith(7, {
      enabled: true,
      geometry: "frame",
    });
    expect(engine.block.setTextBackgroundEnabled).not.toHaveBeenCalled();
    expect(engine.block.setTextBackgroundColor).not.toHaveBeenCalled();
  });

  it("writes a numeric padding for a linked edit", () => {
    const engine = makeEngine({ box: { enabled: true } });
    renderSection(engine);

    fireEvent.change(screen.getByLabelText("All"), { target: { value: "12" } });

    expect(engine.block.setTextBackground).toHaveBeenCalledWith(7, {
      geometry: "frame",
      padding: 12,
    });
  });

  it("writes only the edited side once padding is unlinked", () => {
    const engine = makeEngine({ box: { enabled: true } });
    renderSection(engine);

    fireEvent.click(screen.getByRole("button", { name: "Edit padding sides separately" }));
    fireEvent.change(screen.getByLabelText("Left"), { target: { value: "6" } });

    expect(engine.block.setTextBackground).toHaveBeenCalledWith(7, {
      geometry: "frame",
      padding: { left: 6 },
    });
  });

  it("coalesces a corner-radius drag into a single history entry", () => {
    const engine = makeEngine({ box: { enabled: true } });
    renderSection(engine);

    fireEvent.change(screen.getByLabelText("All"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("All"), { target: { value: "8" } });

    expect(engine.beginBatch).toHaveBeenCalledTimes(1);
  });

  it("closes an open padding burst before applying the box toggle", () => {
    const engine = makeEngine({ box: { enabled: true } });
    renderSection(engine);

    fireEvent.change(screen.getByLabelText("All"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("switch", { name: "Enable Frame" }));

    expect(engine.block.setTextBackgroundEnabled).toHaveBeenCalledWith(7, false);
    expect(engine.block.setTextBackground).toHaveBeenLastCalledWith(7, {
      geometry: "frame",
      padding: 4,
    });
    expect(engine.endBatch).toHaveBeenCalledTimes(1);
    expect(engine.endBatch.mock.invocationCallOrder[0]).toBeLessThan(
      engine.block.setTextBackgroundEnabled.mock.invocationCallOrder[0],
    );
  });

  it("re-derives the padding link when the selected block has asymmetric padding", () => {
    const engine = makeEngine({ box: { enabled: true } });
    const { rerender } = renderSection(engine, 7);

    expect(screen.getByLabelText("All")).toBeTruthy();

    engine.block.getTextBackground.mockReturnValue({
      ...RESOLVED_BOX,
      enabled: true,
      padding: { top: 2, right: 8, bottom: 2, left: 8 },
    });
    rerender(section(engine, 8));

    expect(screen.queryByLabelText("All")).toBeNull();
    expect(screen.getByLabelText("Left")).toBeTruthy();
  });

  it("upgrades loaded legacy union geometry on an explicit Frame padding edit", () => {
    const engine = makeEngine({ box: { enabled: true } });
    renderSection(engine);

    fireEvent.change(screen.getByLabelText("All"), { target: { value: "-4" } });
    expect(engine.block.setTextBackground).toHaveBeenCalledWith(7, {
      geometry: "frame",
      padding: -4,
    });
  });

  it("round-trips a translucent box colour without flattening it", () => {
    const engine = makeEngine({
      box: { enabled: true, color: { r: 1, g: 0, b: 0, a: 0.5 } },
    });
    renderSection(engine);

    expect(colorInput().value).toBe("#ff0000");

    fireEvent.change(colorInput(), { target: { value: "#00ff00" } });

    expect(engine.block.setTextBackground).toHaveBeenCalledWith(7, {
      geometry: "frame",
      color: { r: 0, g: 1, b: 0, a: 0.5 },
    });
  });

  it("hints that the box is suppressed on curved text", () => {
    const engine = makeEngine({ curve: { radius: 120, direction: "up" } });
    renderSection(engine);

    expect(screen.getByText("The Frame is not shown on curved text.")).toBeTruthy();
  });

  it("shows no curved hint for flat text", () => {
    const engine = makeEngine();
    renderSection(engine);

    expect(screen.queryByText("The Frame is not shown on curved text.")).toBeNull();
  });

  it("writes a per-side padding for the highlight via setTextBackgroundPadding", () => {
    const engine = makeEngine();
    engine.block.getTextRuns.mockReturnValue([
      {
        text: "Hello",
        style: {
          backgroundColor: "#FDE68A",
          backgroundPadding: { top: 2, right: 8, bottom: 2, left: 8 },
        },
      },
    ]);
    renderSection(engine);

    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    fireEvent.change(screen.getByLabelText("Left"), { target: { value: "20" } });

    expect(engine.block.setTextBackgroundPadding).toHaveBeenCalledWith(7, 0, 5, {
      top: 2,
      right: 8,
      bottom: 2,
      left: 20,
    });
  });
});
