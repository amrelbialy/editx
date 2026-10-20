import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigationEngine } from "../__tests__/page-navigation-fixture";
import { usePageScreenFrames } from "./use-page-screen-frames";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("page screen frames", () => {
  it("tracks camera transforms once and scales labels to fit the world-space page gap", async () => {
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
      { id: cover, x: 100, y: 120, width: 800, height: 600, scale: 1 },
    ]);
    act(() => {
      zoom = 0.5;
      engine.emit("zoom:changed", zoom);
      pan = { x: 20, y: -30 };
      engine.emit("pan:changed", pan);
    });
    expect(result.current).toEqual([
      { id: cover, x: 70, y: 30, width: 400, height: 300, scale: 0.5 },
    ]);
    act(() => {
      zoom = 2;
      engine.emit("zoom:changed", zoom);
    });
    expect(result.current[0].scale).toBe(1);
    unmount();
    const convert = vi.mocked(engine.editor.worldToScreen);
    convert.mockClear();
    engine.emit("pan:changed", { x: 0, y: 0 });
    expect(convert).not.toHaveBeenCalled();
  });
});
