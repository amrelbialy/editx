import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigationEngine } from "../__tests__/page-navigation-fixture";
import { usePageScreenFrames } from "./use-page-screen-frames";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("page screen frames", () => {
  it("tracks camera transforms once while keeping title lanes in screen pixels", async () => {
    const { engine, cover } = await createNavigationEngine();
    const pages = [{ id: cover }];
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    vi.spyOn(engine.editor, "getZoom").mockImplementation(() => zoom);
    vi.mocked(engine.editor.worldToScreen).mockImplementation(({ x, y }) => ({
      x: x * zoom + pan.x,
      y: y * zoom + pan.y,
    }));
    const { result, unmount } = renderHook(() => usePageScreenFrames(engine, pages));
    expect(result.current).toEqual([
      { id: cover, x: 100, y: 120, width: 800, height: 600, titleY: 96 },
    ]);
    act(() => {
      zoom = 0.5;
      engine.emit("zoom:changed", zoom);
      pan = { x: 20, y: -30 };
      engine.emit("pan:changed", pan);
    });
    expect(result.current).toEqual([
      { id: cover, x: 70, y: 30, width: 400, height: 300, titleY: 6 },
    ]);
    act(() => {
      zoom = 2;
      engine.emit("zoom:changed", zoom);
    });
    expect(result.current[0].titleY).toBe(result.current[0].y - 24);
    unmount();
    const convert = vi.mocked(engine.editor.worldToScreen);
    convert.mockClear();
    engine.emit("pan:changed", { x: 0, y: 0 });
    expect(convert).not.toHaveBeenCalled();
  });

  it("insets low-zoom vertical titles rather than overlapping the preceding page", async () => {
    const { engine, cover, poster } = await createNavigationEngine();
    engine.editor.setPageViewMode("vertical-pages");
    vi.spyOn(engine.editor, "getZoom").mockReturnValue(0.05);
    vi.mocked(engine.editor.getPageViewBounds).mockImplementation((id) =>
      id === cover
        ? { x: 0, y: 0, width: 800, height: 600 }
        : { x: 100, y: 680, width: 600, height: 800 },
    );
    vi.mocked(engine.editor.worldToScreen).mockImplementation(({ x, y }) => ({
      x: x * 0.05,
      y: y * 0.05,
    }));
    const pages = [{ id: cover }, { id: poster }];
    const { result } = renderHook(() => usePageScreenFrames(engine, pages));
    expect(result.current.map(({ titleY }) => titleY)).toEqual([-24, 38]);
  });
});
