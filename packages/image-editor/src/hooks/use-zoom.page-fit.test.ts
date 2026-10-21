import { EditxEngine, type PageViewMode } from "@editx/engine";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useZoom } from "./use-zoom";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("page title fit padding", () => {
  it.each([
    ["all-pages", 24],
    ["active-page", 24],
    ["vertical-pages", 24],
    ["horizontal-pages", 24],
  ] as const)("preserves legacy padding without excessive page gutters in %s", async (mode: PageViewMode, padding) => {
    const engine = new EditxEngine();
    await engine.scene.create();
    vi.spyOn(engine.editor, "getPageViewMode").mockReturnValue(mode);
    const fitPage = vi.spyOn(engine.editor, "fitToScreen");
    const fitSelection = vi.spyOn(engine.editor, "fitToSelection");
    const { result } = renderHook(() => useZoom({ engine, engineRef: { current: engine } }));
    act(() => result.current.handleAutoFitPage());
    expect(fitPage).toHaveBeenLastCalledWith(padding, true);
    act(() => {
      engine.block.select(engine.getActivePage()!);
      result.current.handleFitSelection();
    });
    expect(fitSelection).toHaveBeenLastCalledWith(padding, true);
    const shape = engine.block.addShape(engine.getActivePage()!, "rect", "color", 0, 0, 40, 40);
    act(() => {
      engine.block.select(shape);
      result.current.handleFitSelection();
    });
    expect(fitSelection).toHaveBeenLastCalledWith(24, true);
  });
});
