import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigationEngine } from "../__tests__/page-navigation-fixture";
import { useExportPages } from "./use-export-pages";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("export page selection", () => {
  it("tracks names, active page and document order without changing navigation or history", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    const before = engine.scene.saveToString();
    const { result } = renderHook(() => useExportPages(engine, true, true));
    expect(result.current.target).toEqual({ mode: "current" });
    expect(result.current.selectedIds).toEqual([cover]);
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    act(() => {
      result.current.setMode("selected");
      result.current.toggle(card);
      engine.scene.setActivePage(poster);
      engine.scene.movePage(card, 0);
      engine.scene.setPageProperties(card, { name: "Updated" });
    });
    expect(result.current.pages.map(({ id }) => id)).toEqual([card, cover, poster]);
    expect(result.current.pages[0].name).toBe("Updated");
    expect(result.current.currentPageId).toBe(poster);
    expect(result.current.target).toEqual({ mode: "selected", ids: [cover, card] });
  });

  it("prunes removed pages and disables an empty selection instead of exporting everything", async () => {
    const { engine, cover } = await createNavigationEngine();
    const { result } = renderHook(() => useExportPages(engine, true, true));
    act(() => {
      result.current.setMode("selected");
      engine.scene.removePage(cover);
    });
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.canExport).toBe(false);
    expect(result.current.target).toEqual({ mode: "selected", ids: [] });
    act(() => result.current.setMode("all"));
    expect(result.current.canExport).toBe(true);
  });

  it("resets to the current page when reopening the dialog", async () => {
    const { engine, poster } = await createNavigationEngine();
    const { result, rerender } = renderHook(({ open }) => useExportPages(engine, open, true), {
      initialProps: { open: true },
    });
    act(() => result.current.setMode("all"));
    rerender({ open: false });
    act(() => engine.scene.setActivePage(poster));
    rerender({ open: true });
    expect(result.current.mode).toBe("current");
    expect(result.current.selectedIds).toEqual([poster]);
  });

  it("keeps legacy export unchanged and guards multi-page export until an engine exists", () => {
    const { result, rerender } = renderHook(({ enabled }) => useExportPages(null, true, enabled), {
      initialProps: { enabled: false },
    });
    expect(result.current.target).toBeUndefined();
    expect(result.current.canExport).toBe(true);
    rerender({ enabled: true });
    expect(result.current.canExport).toBe(false);
  });

  it("refreshes metadata and resets selection when a native scene with the same IDs replaces the document", async () => {
    const { engine, cover, card } = await createNavigationEngine();
    const original = engine.scene.saveToString();
    engine.scene.setPageProperties(cover, { name: "Replacement", width: 321, height: 123 });
    const replacement = engine.scene.saveToString();
    await engine.scene.loadFromString(original);
    const { result } = renderHook(() => useExportPages(engine, true, true));
    act(() => {
      result.current.setMode("selected");
      result.current.toggle(card);
    });
    expect(result.current.selectedIds).toEqual([cover, card]);
    await act(async () => {
      await engine.scene.loadFromString(replacement);
    });
    expect(result.current.pages[0]).toMatchObject({
      id: cover,
      name: "Replacement",
      width: 321,
      height: 123,
    });
    expect(result.current.mode).toBe("current");
    expect(result.current.selectedIds).toEqual([cover]);
  });
});
