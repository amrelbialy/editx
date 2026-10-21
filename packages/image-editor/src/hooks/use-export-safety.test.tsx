import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExportFixture as setup } from "../__tests__/export-fixture";
import { resetPageNavigationStore } from "../__tests__/page-navigation-fixture";
import { useImageEditorStore } from "../store/image-editor-store";

beforeEach(() => {
  resetPageNavigationStore();
  useImageEditorStore.getState().markDirty();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("export document safety", () => {
  it.each([
    "current",
    "selected",
  ] as const)("%s: partial export retains unsaved changes and does not auto-close", async (mode) => {
    const onClose = vi.fn();
    const { result, engine, cover, poster, onSave } = await setup({
      onClose,
      exportConfig: { closeAfterSave: true },
    });
    act(() => engine.scene.setPageProperties(poster, { name: "Unsaved other page" }));
    await act(async () => {
      const pages = mode === "current" ? { mode } : { mode, ids: [cover] };
      expect(await result.current.handleExport({ pages })).toBe(true);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("marks the document clean and auto-closes when selected pages cover the whole document", async () => {
    const onClose = vi.fn();
    const { result, engine } = await setup({ onClose, exportConfig: { closeAfterSave: true } });
    await act(async () => {
      expect(
        await result.current.handleExport({
          pages: { mode: "selected", ids: engine.scene.getPages() },
        }),
      ).toBe(true);
    });
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(false);
    expect(onClose).toHaveBeenCalledWith("save", false);
  });

  it("aborts a ZIP after same-ID scene replacement without rendering later pages or invoking save hooks", async () => {
    const onBeforeSave = vi.fn((blob: Blob) => blob);
    const onClose = vi.fn();
    const { result, engine, page, onSave, notify } = await setup({
      events: { onBeforeSave },
      onClose,
      exportConfig: { closeAfterSave: true },
    });
    let finish!: (blob: Blob) => void;
    page.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    const replacement = engine.scene.saveToString();
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport({ pages: { mode: "all" } });
    });
    await act(async () => {
      await engine.scene.loadFromString(replacement);
      finish(new Blob(["old document first page"]));
      expect(await pending).toBe(false);
    });
    expect(page).toHaveBeenCalledTimes(1);
    expect(onBeforeSave).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(notify.error).toHaveBeenCalledWith(
      "The document changed during export. Please try again.",
    );
  });

  it("rejects document changes during before-save processing before delivering output", async () => {
    const onBeforeSave = vi.fn(async (blob: Blob) => blob);
    const { result, engine, cover, onSave, notify } = await setup({ events: { onBeforeSave } });
    onBeforeSave.mockImplementation(async (blob) => {
      engine.scene.setPageProperties(cover, { name: "Changed during processing" });
      return blob;
    });
    await act(async () => {
      expect(await result.current.handleExport()).toBe(false);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      "The document changed during export. Please try again.",
    );
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
  });

  it("does not clear new changes or auto-close after an async host save has started", async () => {
    let finish!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onClose = vi.fn();
    const { result, engine, cover } = await setup({
      onSave,
      onClose,
      exportConfig: { closeAfterSave: true },
    });
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    act(() => engine.scene.setPageProperties(cover, { name: "New changes after output" }));
    await act(async () => {
      finish();
      expect(await pending).toBe(true);
    });
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not deliver an old engine's output after the editor is replaced", async () => {
    const { result, engineRef, scene, onSave, notify } = await setup();
    let finish!: (blob: Blob) => void;
    scene.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = result.current.handleExport();
    });
    engineRef.current = null;
    await act(async () => {
      finish(new Blob(["old output"]));
      expect(await pending).toBe(false);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(
      "The editor changed during export. Please try again.",
    );
  });
});
