import { readEditxArchive } from "@editx/engine";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPageNavigationStore } from "../__tests__/page-navigation-fixture";
import { createProjectFileFixture, projectPng } from "../__tests__/project-file-fixture";
import { I18nProvider } from "../i18n/i18n-context";
import { useImageEditorStore } from "../store/image-editor-store";
import { downloadBlob } from "../utils/download-blob";
import { useProjectFile } from "./use-project-file";

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("./use-notifications", () => ({ useNotifications: () => notify }));
vi.mock("../utils/download-blob", () => ({ downloadBlob: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  resetPageNavigationStore();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function setup() {
  const fixture = await createProjectFileFixture();
  const hook = renderHook(
    () => useProjectFile({ engineRef: fixture.engineRef, filename: "studio-posts.editx" }),
    { wrapper: I18nProvider },
  );
  return { ...fixture, ...hook };
}

describe("project file UI actions", () => {
  it("downloads a native archive and marks clean only after an unchanged download", async () => {
    const { result } = await setup();
    useImageEditorStore.getState().markDirty();
    await act(async () => {
      await result.current.save();
    });
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "application/vnd.editx+zip" }),
      "studio-posts",
    );
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(false);
    expect(notify.info).toHaveBeenCalledWith(expect.stringContaining("not self-contained"));
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("validates before prompting, supports cancel, and confirms before discarding edits", async () => {
    const { engine, cover, result } = await setup();
    const bytes = engine.document.saveToArchive();
    engine.scene.resizePage(cover, 320, 480);
    useImageEditorStore.getState().markDirty();
    const before = engine.document.saveToString();
    await act(async () => {
      await result.current.open(bytes);
    });
    expect(result.current.pending).not.toBeNull();
    expect(engine.document.saveToString()).toBe(before);
    act(() => result.current.cancelOpen());
    expect(result.current.pending).toBeNull();
    expect(engine.document.saveToString()).toBe(before);
    await act(async () => {
      await result.current.open(bytes);
    });
    act(() => result.current.confirmOpen());
    await waitFor(() => expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(false));
    expect(engine.scene.getPageProperties(cover).width).toBe(800);
    expect(engine.canUndo()).toBe(false);
    expect(notify.success).toHaveBeenCalledWith("Project opened");
  });

  it("retains unsaved edits and redo when an invalid project is selected", async () => {
    const { engine, cover, result } = await setup();
    engine.block.setName(cover, "Changed");
    engine.undo();
    useImageEditorStore.getState().markDirty();
    const before = engine.document.saveToString();
    await act(async () => {
      await result.current.open(new Uint8Array([1, 2, 3]));
    });
    expect(result.current.pending).toBeNull();
    expect(engine.document.saveToString()).toBe(before);
    expect(engine.canRedo()).toBe(true);
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("does not download stale bytes or mark clean when content changes during preview", async () => {
    const { engine, cover, preview, result } = await setup();
    useImageEditorStore.getState().markDirty();
    let finish!: (blob: Blob) => void;
    preview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.save();
    });
    act(() => engine.block.setName(cover, "New edit"));
    await act(async () => {
      finish(new Blob([projectPng], { type: "image/png" }));
      await pending;
    });
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(notify.error).toHaveBeenCalledWith(expect.stringContaining("document changed"));
  });

  it("does not mark clean over additional edits while a valid project is loading", async () => {
    const { engine, cover, result } = await setup();
    const bytes = engine.document.saveToArchive();
    engine.scene.resizePage(cover, 320, 480);
    vi.spyOn(engine.document, "loadFromArchive").mockImplementationOnce(async (input) => {
      const archive = readEditxArchive(input);
      await engine.document.loadFromString(archive.documentJson);
      engine.block.setName(cover, "Newer edit during load");
      return archive;
    });
    await act(async () => {
      await result.current.open(bytes);
    });
    expect(engine.block.getName(cover)).toBe("Newer edit during load");
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
    expect(notify.info).toHaveBeenCalledWith(expect.stringContaining("remain unsaved"));
  });
});
