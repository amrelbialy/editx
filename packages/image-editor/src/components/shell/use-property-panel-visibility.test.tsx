import type { EditxEngine } from "@editx/engine";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageEditorProvider } from "../../config/config-context";
import { useImageEditorStore } from "../../store/image-editor-store";
import { usePropertyPanelVisibility } from "./use-property-panel-visibility";

function makeEngine() {
  const fillEnabled = new Map([
    [7, true],
    [8, false],
  ]);
  const strokeEnabled = new Map([[7, false]]);
  let historyChanged = () => {};
  const block = {
    isFillEnabled: vi.fn((blockId: number) => fillEnabled.get(blockId) ?? false),
    setFillEnabled: vi.fn((blockId: number, enabled: boolean) => {
      fillEnabled.set(blockId, enabled);
    }),
    isStrokeEnabled: vi.fn((blockId: number) => strokeEnabled.get(blockId) ?? false),
    setStrokeEnabled: vi.fn((blockId: number, enabled: boolean) => {
      strokeEnabled.set(blockId, enabled);
    }),
    getStrokeWidth: vi.fn().mockReturnValue(0),
    setStrokeWidth: vi.fn(),
    getStrokeColor: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0, a: 0 }),
    setStrokeColor: vi.fn(),
    getParent: vi.fn().mockReturnValue(null),
    getPageDimensions: vi.fn().mockReturnValue({ width: 500, height: 400 }),
    isShadowEnabled: vi.fn().mockReturnValue(false),
    setShadowEnabled: vi.fn(),
    getTextRuns: vi.fn().mockReturnValue([{ text: "Text", style: {} }]),
    getTextContent: vi.fn().mockReturnValue("Text"),
    setTextShadow: vi.fn(),
  };
  const engine = {
    block,
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    onHistoryChanged: vi.fn((callback: () => void) => {
      historyChanged = callback;
      return () => {};
    }),
    fireHistory: () => historyChanged(),
  };
  return engine as unknown as EditxEngine & {
    block: typeof block;
    fireHistory: () => void;
  };
}

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ImageEditorProvider
    config={{ shapes: { defaultStrokeColor: "#123456", defaultStrokeWidth: 3 } }}
  >
    {children}
  </ImageEditorProvider>
);

describe("usePropertyPanelVisibility", () => {
  afterEach(() => {
    useImageEditorStore.setState({ editingTextBlockId: null, textSelectionRange: null });
  });

  it("uses persisted fill state and refreshes for selection and history changes", () => {
    const engine = makeEngine();
    const { result, rerender } = renderHook(
      ({ blockId }) =>
        usePropertyPanelVisibility({ engine, panel: "fill", blockId, blockType: "graphic" }),
      { initialProps: { blockId: 7 }, wrapper },
    );

    expect(result.current?.enabled).toBe(true);
    act(() => result.current?.onToggle());
    expect(engine.block.setFillEnabled).toHaveBeenCalledWith(7, false);
    expect(result.current?.enabled).toBe(false);

    rerender({ blockId: 8 });
    expect(result.current?.enabled).toBe(false);

    engine.block.setFillEnabled(8, true);
    act(() => engine.fireHistory());
    expect(result.current?.enabled).toBe(true);
  });

  it("preserves visible defaults when enabling graphic stroke", () => {
    const engine = makeEngine();
    const { result } = renderHook(
      () =>
        usePropertyPanelVisibility({
          engine,
          panel: "stroke",
          blockId: 7,
          blockType: "graphic",
        }),
      { wrapper },
    );

    act(() => result.current?.onToggle());

    expect(engine.block.setStrokeEnabled).toHaveBeenCalledWith(7, true);
    expect(engine.block.setStrokeWidth).toHaveBeenCalledWith(7, 3);
    expect(engine.block.setStrokeColor).toHaveBeenCalledWith(7, {
      r: 0x12 / 255,
      g: 0x34 / 255,
      b: 0x56 / 255,
      a: 1,
    });
  });

  it("refreshes graphic stroke from persisted history state", () => {
    const engine = makeEngine();
    const { result } = renderHook(
      () =>
        usePropertyPanelVisibility({
          engine,
          panel: "stroke",
          blockId: 7,
          blockType: "graphic",
        }),
      { wrapper },
    );

    expect(result.current?.enabled).toBe(false);

    engine.block.setStrokeEnabled(7, true);
    act(() => engine.fireHistory());

    expect(result.current?.enabled).toBe(true);
  });

  it("refreshes text shadow when the active character selection moves", () => {
    useImageEditorStore.setState({
      editingTextBlockId: 7,
      textSelectionRange: { from: 0, to: 1 },
    });
    const engine = makeEngine();
    engine.block.getTextRuns.mockReturnValue([
      { text: "A", style: {} },
      { text: "B", style: { textShadowColor: "#000000" } },
    ]);
    const { result } = renderHook(
      () =>
        usePropertyPanelVisibility({
          engine,
          panel: "shadow",
          blockId: 7,
          blockType: "text",
        }),
      { wrapper },
    );

    expect(result.current?.enabled).toBe(false);

    act(() => {
      useImageEditorStore.setState({ textSelectionRange: { from: 1, to: 2 } });
    });

    expect(result.current?.enabled).toBe(true);
  });

  it("enables text shadow defaults over the active character selection", () => {
    useImageEditorStore.setState({
      editingTextBlockId: 7,
      textSelectionRange: { from: 1, to: 3 },
    });
    const engine = makeEngine();
    const { result } = renderHook(
      () =>
        usePropertyPanelVisibility({
          engine,
          panel: "shadow",
          blockId: 7,
          blockType: "text",
        }),
      { wrapper },
    );

    act(() => result.current?.onToggle());

    expect(engine.block.setTextShadow).toHaveBeenCalledWith(7, 1, 3, {
      color: "#000000",
      blur: 4,
      offsetX: 2,
      offsetY: 2,
    });
  });
});
