import type { EditxEngine } from "@editx/engine";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TextFrameShadowControls } from "./text-frame-shadow-controls.component";
import { TextFrameStrokeControls } from "./text-frame-stroke-controls.component";

vi.mock("../ui/slider-field", () => ({
  SliderField: (props: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onCommit?: (value: number) => void;
  }) => (
    <input
      aria-label={props.label}
      type="number"
      value={props.value}
      onChange={(event) => props.onChange(Number(event.target.value))}
      onBlur={() => props.onCommit?.(props.value)}
    />
  ),
}));

interface DecorationState {
  strokeEnabled: boolean;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
}

function makeEngine(initial: Partial<DecorationState> = {}) {
  const state: DecorationState = {
    strokeEnabled: true,
    strokeWidth: 2,
    shadowEnabled: true,
    shadowX: 1,
    shadowY: 2,
    shadowBlur: 3,
    ...initial,
  };
  const historyListeners: Array<() => void> = [];
  const block = {
    isStrokeEnabled: vi.fn(() => state.strokeEnabled),
    getStrokeColor: vi.fn().mockReturnValue({ r: 1, g: 0, b: 0, a: 1 }),
    getStrokeWidth: vi.fn(() => state.strokeWidth),
    setStrokeEnabled: vi.fn((enabled: boolean) => {
      state.strokeEnabled = enabled;
    }),
    setStrokeColor: vi.fn(),
    setStrokeWidth: vi.fn((width: number) => {
      state.strokeWidth = width;
    }),
    getParent: vi.fn().mockReturnValue(1),
    getPageDimensions: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    isShadowEnabled: vi.fn(() => state.shadowEnabled),
    getShadowColor: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0, a: 1 }),
    getShadowOffsetX: vi.fn(() => state.shadowX),
    getShadowOffsetY: vi.fn(() => state.shadowY),
    getShadowBlur: vi.fn(() => state.shadowBlur),
    setShadowEnabled: vi.fn((enabled: boolean) => {
      state.shadowEnabled = enabled;
    }),
    setShadowColor: vi.fn(),
    setShadowOffsetX: vi.fn((value: number) => {
      state.shadowX = value;
    }),
    setShadowOffsetY: vi.fn((value: number) => {
      state.shadowY = value;
    }),
    setShadowBlur: vi.fn((value: number) => {
      state.shadowBlur = value;
    }),
    setTextStroke: vi.fn(),
    setTextShadow: vi.fn(),
  };
  const engine = {
    block,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
    onHistoryChanged: vi.fn((listener: () => void) => {
      historyListeners.push(listener);
      return () => {};
    }),
  };
  return {
    engine: engine as unknown as EditxEngine,
    block,
    state,
    emitHistory: () =>
      historyListeners.forEach((listener) => {
        listener();
      }),
    beginBatch: engine.beginBatch,
    endBatch: engine.endBatch,
  };
}

function renderControls(engine: EditxEngine) {
  return render(
    <I18nProvider>
      <TextFrameStrokeControls engine={engine} blockId={7} />
      <TextFrameShadowControls engine={engine} blockId={7} />
    </I18nProvider>,
  );
}

describe("text frame decoration controls", () => {
  afterEach(cleanup);

  it("renders explicit Frame Stroke and Frame Shadow controls", () => {
    const { engine } = makeEngine();
    renderControls(engine);

    expect(screen.getByRole("switch", { name: "Frame Stroke" })).toBeTruthy();
    expect(screen.getByLabelText("Stroke Color")).toHaveValue("#ff0000");
    expect(screen.getByRole("switch", { name: "Frame Shadow" })).toBeTruthy();
    expect(screen.getByLabelText("Shadow X")).toHaveValue(1);
    expect(screen.getByLabelText("Shadow Y")).toHaveValue(2);
  });

  it("uses a visible default width when enabling a stored zero-width stroke", () => {
    const { engine, block } = makeEngine({ strokeEnabled: false, strokeWidth: 0 });
    renderControls(engine);

    fireEvent.click(screen.getByRole("switch", { name: "Frame Stroke" }));

    expect(block.setStrokeEnabled).toHaveBeenCalledWith(7, true);
    expect(block.setStrokeWidth).toHaveBeenCalledWith(7, 3);
    expect(block.setTextStroke).not.toHaveBeenCalled();
  });

  it("writes continuous stroke and shadow edits through block APIs only", () => {
    const { engine, block, beginBatch } = makeEngine();
    renderControls(engine);

    fireEvent.change(screen.getByLabelText("Stroke Color"), { target: { value: "#00ff00" } });
    fireEvent.change(screen.getByLabelText("Stroke Width"), { target: { value: "4.5" } });
    fireEvent.change(screen.getByLabelText("Shadow Color"), { target: { value: "#0000ff" } });
    fireEvent.change(screen.getByLabelText("Shadow X"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Shadow Y"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Shadow Blur"), { target: { value: "12" } });

    expect(block.setStrokeColor).toHaveBeenCalledWith(7, { r: 0, g: 1, b: 0, a: 1 });
    expect(block.setStrokeWidth).toHaveBeenCalledWith(7, 4.5);
    expect(block.setShadowColor).toHaveBeenCalledWith(7, { r: 0, g: 0, b: 1, a: 1 });
    expect(block.setShadowOffsetX).toHaveBeenCalledWith(7, 8);
    expect(block.setShadowOffsetY).toHaveBeenCalledWith(7, 9);
    expect(block.setShadowBlur).toHaveBeenCalledWith(7, 12);
    expect(beginBatch).toHaveBeenCalledTimes(2);
    expect(block.setTextStroke).not.toHaveBeenCalled();
    expect(block.setTextShadow).not.toHaveBeenCalled();
  });

  it("flushes open edits before discrete decoration toggles and on input blur", () => {
    const { engine, block, endBatch } = makeEngine();
    renderControls(engine);

    fireEvent.change(screen.getByLabelText("Stroke Width"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("switch", { name: "Frame Stroke" }));

    expect(endBatch).toHaveBeenCalledTimes(1);
    expect(endBatch.mock.invocationCallOrder[0]).toBeLessThan(
      block.setStrokeEnabled.mock.invocationCallOrder[0],
    );

    const shadowX = screen.getByLabelText("Shadow X");
    fireEvent.change(shadowX, { target: { value: "5" } });
    fireEvent.blur(shadowX);
    expect(endBatch).toHaveBeenCalledTimes(2);

    fireEvent.change(shadowX, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("switch", { name: "Frame Shadow" }));

    expect(endBatch).toHaveBeenCalledTimes(3);
    expect(endBatch.mock.invocationCallOrder[2]).toBeLessThan(
      block.setShadowEnabled.mock.invocationCallOrder[0],
    );
  });

  it("refreshes displayed values after history changes", () => {
    const { engine, state, emitHistory } = makeEngine();
    renderControls(engine);

    state.strokeWidth = 7;
    state.shadowX = -4;
    act(emitHistory);

    expect(screen.getByLabelText("Stroke Width")).toHaveValue(7);
    expect(screen.getByLabelText("Shadow X")).toHaveValue(-4);
  });
});
