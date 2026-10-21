import { act, cleanup, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNavigationEngine,
  resetPageNavigationStore,
} from "../__tests__/page-navigation-fixture";
import { I18nProvider } from "../i18n/i18n-context";
import { usePageManagement } from "./use-page-management";

beforeEach(resetPageNavigationStore);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("page management through public engine APIs", () => {
  it("adds and duplicates with one undo entry, selects and reveals the new page", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    const fit = vi.spyOn(engine.editor, "fitToScreen");
    const { result } = renderHook(() => usePageManagement(engine, false));
    act(() => result.current.add());
    const added = engine.scene.getCurrentPage()!;
    expect(engine.scene.getPageProperties(added)).toMatchObject({ width: 800, height: 600 });
    expect(engine.block.findAllSelected()).toEqual([added]);
    expect(fit).toHaveBeenLastCalledWith(24);
    act(() => engine.undo());
    expect(engine.scene.getPages()).toEqual([cover, poster, card]);
    expect(engine.canUndo()).toBe(false);
    act(() => result.current.duplicate(poster));
    const copy = engine.scene.getCurrentPage()!;
    expect(engine.scene.getPages()).toEqual([cover, poster, copy, card]);
    expect(engine.scene.getPageProperties(copy)).toEqual(engine.scene.getPageProperties(poster));
    expect(engine.block.findAllSelected()).toEqual([copy]);
    act(() => engine.undo());
    expect(engine.scene.getPages()).toEqual([cover, poster, card]);
    expect(engine.canUndo()).toBe(false);
    act(() => engine.redo());
    expect(engine.scene.getCurrentPage()).toBe(copy);
  });

  it("renames and resizes atomically, keeps other properties and artwork unchanged", async () => {
    const { engine, cover } = await createNavigationEngine();
    const text = engine.block.addText(cover, 10, 20, 100, 40, "Artwork");
    engine.clearHistory();
    const before = engine.scene.getPageProperties(cover);
    const { result } = renderHook(() => usePageManagement(engine, false));
    act(() => result.current.edit(cover));
    expect(engine.canUndo()).toBe(false);
    act(() => result.current.save(cover, { name: "Renamed", width: 350.5, height: 240 }));
    expect(result.current.draft).toBeNull();
    expect(engine.scene.getPageProperties(cover)).toEqual({
      ...before,
      name: "Renamed",
      width: 350.5,
      height: 240,
    });
    expect(engine.block.getPosition(text)).toEqual({ x: 10, y: 20 });
    expect(engine.block.getSize(text)).toEqual({ width: 100, height: 40 });
    act(() => engine.undo());
    expect(engine.scene.getPageProperties(cover)).toEqual(before);
    expect(engine.canUndo()).toBe(false);
  });

  it("reorders without navigating and deletes an active page with a visible fallback", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    const { result } = renderHook(() => usePageManagement(engine, false));
    act(() => result.current.move(poster, -1));
    expect(engine.scene.getPages()).toEqual([poster, cover, card]);
    expect(engine.scene.getCurrentPage()).toBe(cover);
    act(() => result.current.remove(cover));
    const active = engine.scene.getCurrentPage()!;
    expect(engine.scene.getPages()).not.toContain(cover);
    expect(engine.block.findAllSelected()).toEqual([active]);
    act(() => engine.undo());
    expect(engine.scene.getPages()).toEqual([poster, cover, card]);
    expect(engine.scene.getCurrentPage()).toBe(cover);
  });

  it("reports last-page deletion and failed edits without mutation or dialog dismissal", async () => {
    const { engine, cover, poster, card } = await createNavigationEngine();
    engine.scene.removePage(poster);
    engine.scene.removePage(card);
    engine.clearHistory();
    const error = vi.spyOn(toast, "error");
    const { result } = renderHook(() => usePageManagement(engine, false), {
      wrapper: I18nProvider,
    });
    act(() => result.current.remove(cover));
    expect(error).toHaveBeenLastCalledWith(
      "Could not update pages: The last page cannot be deleted.",
    );
    expect(engine.scene.getPages()).toEqual([cover]);
    act(() => result.current.edit(cover));
    act(() => result.current.save(cover, { name: "Invalid", width: 0, height: 10 }));
    expect(error).toHaveBeenCalledTimes(2);
    expect(result.current.draft?.id).toBe(cover);
    expect(engine.scene.getPageProperties(cover).name).toBe("Cover");
    expect(engine.canUndo()).toBe(false);
  });

  it("blocks all management while editing and preserves history and document", async () => {
    const { engine, cover } = await createNavigationEngine();
    const error = vi.spyOn(toast, "error");
    const saved = engine.scene.saveToString();
    const { result } = renderHook(() => usePageManagement(engine, true));
    act(() => {
      result.current.add();
      result.current.duplicate(cover);
      result.current.remove(cover);
      result.current.move(cover, 1);
      result.current.edit(cover);
      result.current.save(cover, { name: "Blocked" });
      result.current.setBackground(cover, "#ff0000");
    });
    expect(error).toHaveBeenCalledTimes(7);
    expect(engine.scene.saveToString()).toBe(saved);
    expect(engine.canUndo()).toBe(false);
    expect(result.current.draft).toBeNull();
  });

  it("changes only the target page's background, preserves alpha, and undoes atomically", async () => {
    const { engine, cover, poster } = await createNavigationEngine();
    engine.scene.setPageProperties(cover, { backgroundColor: { r: 1, g: 1, b: 1, a: 0.4 } });
    engine.clearHistory();
    const before = engine.scene.getPageProperties(cover);
    const other = engine.scene.getPageProperties(poster);
    const { result } = renderHook(() => usePageManagement(engine, false));
    act(() => result.current.setBackground(cover, "#ff0000"));
    expect(engine.scene.getPageProperties(cover)).toEqual({
      ...before,
      backgroundColor: { r: 1, g: 0, b: 0, a: 0.4 },
    });
    expect(engine.scene.getPageProperties(poster)).toEqual(other);
    act(() => engine.undo());
    expect(engine.scene.getPageProperties(cover)).toEqual(before);
    expect(engine.canUndo()).toBe(false);
    act(() => engine.redo());
    expect(engine.scene.getPageProperties(cover).backgroundColor).toEqual({
      r: 1,
      g: 0,
      b: 0,
      a: 0.4,
    });
  });

  it("dismisses stale drafts on removal and same-ID document replacement", async () => {
    const { engine, cover, poster } = await createNavigationEngine();
    const saved = engine.scene.saveToString();
    const { result } = renderHook(() => usePageManagement(engine, false));
    act(() => result.current.edit(poster));
    act(() => engine.scene.removePage(poster));
    expect(result.current.draft).toBeNull();
    act(() => result.current.edit(cover));
    await act(async () => engine.scene.loadFromString(saved));
    expect(result.current.draft).toBeNull();
  });
});
