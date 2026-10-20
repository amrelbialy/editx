import { PageViewError } from "@editx/engine";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNavigationEngine,
  resetPageNavigationStore,
} from "../__tests__/page-navigation-fixture";
import type { PageNavigationLayout } from "../config/ui-config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { usePageNavigation } from "./use-page-navigation";

beforeEach(resetPageNavigationStore);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("page navigation integration", () => {
  it("switches canvas orientation without changing authored data or history", async () => {
    const { engine, setMode } = await createNavigationEngine();
    const before = engine.scene.saveToString();
    const { rerender, unmount } = renderHook(
      ({ layout }: { layout: PageNavigationLayout }) => usePageNavigation(engine, layout),
      { initialProps: { layout: "vertical" } },
    );
    rerender({ layout: "horizontal" });
    expect(setMode).toHaveBeenLastCalledWith("horizontal-pages");
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    unmount();
    expect(setMode).toHaveBeenLastCalledWith("all-pages");
  });

  it("enables a continuous vertical canvas and restores the previous mode on unmount", async () => {
    const { engine, setMode } = await createNavigationEngine();
    const before = engine.scene.saveToString();
    const { result, unmount } = renderHook(() => usePageNavigation(engine));
    expect(setMode).toHaveBeenCalledWith("vertical-pages");
    expect(result.current.disabled).toBe(false);
    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(false);
    unmount();
    expect(setMode).toHaveBeenLastCalledWith("all-pages");
  });

  it("follows SDK navigation and retargets page tools without marking the document dirty", async () => {
    const { engine, poster } = await createNavigationEngine();
    const { result } = renderHook(() => usePageNavigation(engine));
    act(() => {
      useImageEditorStore.getState().setEditingTextBlockId(42);
      useImageEditorStore.getState().setTextSelectionRange({ from: 0, to: 1 });
      useImageEditorStore.getState().setActiveTool("crop");
      engine.scene.setActivePage(poster);
    });
    expect(result.current.activePageId).toBe(poster);
    expect(useImageEditorStore.getState()).toMatchObject({
      editableBlockId: poster,
      editingTextBlockId: null,
      textSelectionRange: null,
      activeTool: "select",
      cropPreset: "free",
      hasUnsavedChanges: false,
      originalImage: { width: 600, height: 800 },
    });
  });

  it("selects a page without fitting or changing history and page membership", async () => {
    const { engine, poster } = await createNavigationEngine();
    const fit = vi.spyOn(engine.editor, "fitToScreen");
    const before = engine.scene.saveToString();
    const { result } = renderHook(() => usePageNavigation(engine));
    fit.mockClear();
    act(() => result.current.navigate(poster));
    expect(result.current.activePageId).toBe(poster);
    expect(fit).not.toHaveBeenCalled();
    expect(result.current.selectedPageId).toBe(poster);
    expect(JSON.parse(engine.scene.saveToString())).toEqual({
      ...JSON.parse(before),
      activePageId: poster,
    });
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(false);
  });

  it("explicitly fits keyboard navigation and clears group context", async () => {
    const { engine, poster } = await createNavigationEngine();
    const { result } = renderHook(() => usePageNavigation(engine));
    const group = engine.block.create("group");
    engine.block.appendChild(poster, group);
    engine.block.enterGroup(group);
    const fit = vi.spyOn(engine.editor, "fitToScreen");
    act(() => result.current.navigate(poster, true));
    expect(fit).toHaveBeenLastCalledWith(48);
    expect(engine.block.getGroupContext()).toEqual([]);
    expect(engine.block.findAllSelected()).toEqual([poster]);
  });

  it("ends inline editing when the same page background is selected", async () => {
    const { engine, cover } = await createNavigationEngine();
    renderHook(() => usePageNavigation(engine));
    const text = engine.block.addText(cover, 0, 0, 100, 40, "Keep text");
    act(() => {
      engine.block.beginTextEditing(text);
      useImageEditorStore.getState().setEditingTextBlockId(text);
      engine.block.select(cover);
    });
    expect(engine.block.getTextEditingSession(text)).toBeNull();
    expect(useImageEditorStore.getState().editingTextBlockId).toBeNull();
    expect(engine.block.getTextContent(text)).toBe("Keep text");
  });

  it("tracks names, page order, deletion, undo, and same-ID native reloads", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    const saved = engine.scene.saveToString();
    const { result } = renderHook(() => usePageNavigation(engine));
    act(() => {
      engine.scene.setPageProperties(poster, { name: "Renamed" });
      engine.scene.movePage(card, 0);
    });
    expect(result.current.pages.map(({ name }) => name)).toEqual(["Card", "Cover", "Renamed"]);
    act(() => engine.scene.removePage(cover));
    expect(result.current.pages.map(({ id }) => id)).not.toContain(cover);
    act(() => engine.undo());
    expect(result.current.pages.map(({ id }) => id)).toContain(cover);
    await act(async () => engine.scene.loadFromString(saved));
    expect(result.current.pages.map(({ name }) => name)).toEqual(["Cover", "Poster", "Card"]);
  });

  it("disables page controls during inline editing and engine crop mode", async () => {
    const { engine } = await createNavigationEngine();
    const { result } = renderHook(() => usePageNavigation(engine));
    act(() => useImageEditorStore.getState().setEditingTextBlockId(42));
    expect(result.current.disabled).toBe(true);
    act(() => {
      useImageEditorStore.getState().setEditingTextBlockId(null);
      engine.emit("editMode:changed", { mode: "Crop", previousMode: "Transform" });
    });
    expect(result.current.disabled).toBe(true);
    act(() => engine.emit("editMode:changed", { mode: "Transform", previousMode: "Crop" }));
    expect(result.current.disabled).toBe(false);
  });

  it("refreshes matching-ID page tools and clears stale inline UI after native reload", async () => {
    const { engine, cover } = await createNavigationEngine();
    const text = engine.block.addText(cover, 10, 10, 100, 40, "Restored text");
    engine.scene.setPageProperties(cover, { name: "Restored", width: 720, height: 900 });
    const saved = engine.scene.saveToString();
    engine.scene.setPageProperties(cover, { name: "Old", width: 800, height: 600 });
    const { result } = renderHook(() => usePageNavigation(engine));
    act(() => {
      engine.block.beginTextEditing(text);
      useImageEditorStore.getState().setEditingTextBlockId(text);
    });

    await act(async () => engine.scene.loadFromString(saved));

    expect(result.current.disabled).toBe(false);
    expect(useImageEditorStore.getState()).toMatchObject({
      editableBlockId: cover,
      editingTextBlockId: null,
      originalImage: { name: "Restored", width: 720, height: 900 },
    });
  });

  it("preserves a valid inline session when only undo history is cleared", async () => {
    const { engine, cover } = await createNavigationEngine();
    const text = engine.block.addText(cover, 10, 10, 100, 40, "Keep editing");
    const { result } = renderHook(() => usePageNavigation(engine));
    act(() => {
      engine.block.beginTextEditing(text);
      useImageEditorStore.getState().setEditingTextBlockId(text);
      engine.clearHistory();
    });
    expect(engine.block.getTextEditingSession(text)).not.toBeNull();
    expect(useImageEditorStore.getState().editingTextBlockId).toBe(text);
    expect(result.current.disabled).toBe(true);
  });

  it("surfaces unsupported continuous layout instead of silently enabling navigation", async () => {
    const { engine, setMode } = await createNavigationEngine();
    setMode.mockImplementation(() => {
      throw new PageViewError("UNSUPPORTED_RENDERER", "Continuous layout unavailable");
    });
    const { result } = renderHook(() => usePageNavigation(engine));
    expect(result.current.error).toBe("Continuous layout unavailable");
    expect(result.current.disabled).toBe(true);
  });

  it("removes subscriptions and safely tolerates engine disposal before unmount", async () => {
    const { engine, cover, poster, setMode } = await createNavigationEngine();
    const { unmount } = renderHook(() => usePageNavigation(engine));
    unmount();
    engine.scene.setActivePage(poster);
    expect(useImageEditorStore.getState().editableBlockId).toBe(cover);
    const mounted = renderHook(() => usePageNavigation(engine));
    engine.dispose();
    setMode.mockRestore();
    expect(() => mounted.unmount()).not.toThrow();
  });
});
