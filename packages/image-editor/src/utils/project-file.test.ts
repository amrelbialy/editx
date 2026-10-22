import { EditxArchiveError, EditxEngine, readEditxArchive } from "@editx/engine";
import { zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPageNavigationStore } from "../__tests__/page-navigation-fixture";
import { createProjectFileFixture, projectPng } from "../__tests__/project-file-fixture";
import { useImageEditorStore } from "../store/image-editor-store";
import { loadPreparedProject, prepareProjectFile, saveProject } from "./project-file";

beforeEach(resetPageNavigationStore);
afterEach(() => vi.restoreAllMocks());

describe("editable project file orchestration", () => {
  it("packages all pages, a PNG preview and dependency reports without marking a Blob saved", async () => {
    const { engine, engineRef, preview, card } = await createProjectFileFixture();
    engine.scene.setActivePage(card);
    useImageEditorStore.getState().markDirty();
    const before = engine.document.saveToString();
    const blob = await saveProject(engineRef);
    const archive = readEditxArchive(new Uint8Array(await blob.arrayBuffer()));
    expect(blob.type).toBe("application/vnd.editx+zip");
    expect(archive.documentJson).toBe(before);
    expect(archive.preview).toEqual(projectPng);
    expect(archive.manifest.selfContained).toBe(false);
    expect(preview).toHaveBeenCalledTimes(1);
    expect(engine.document.saveToString()).toBe(before);
    expect(engine.scene.getCurrentPage()).toBe(card);
    expect(engine.canUndo()).toBe(false);
    expect(useImageEditorStore.getState().hasUnsavedChanges).toBe(true);
  });

  it("opens owned bytes through the validated loader and retargets page editing state", async () => {
    const { engine, engineRef, cover } = await createProjectFileFixture();
    const bytes = engine.document.saveToArchive();
    engine.scene.resizePage(cover, 320, 480);
    const file = await prepareProjectFile(engineRef, bytes);
    useImageEditorStore.setState({
      activeTool: "crop",
      editingTextBlockId: 999,
      textSelectionRange: { from: 0, to: 1 },
    });
    const result = await loadPreparedProject(engineRef, file);
    expect(result.info.manifest.kind).toBe("editx-archive");
    expect(result.unchanged).toBe(true);
    expect(engine.scene.getPageProperties(cover).width).toBe(800);
    expect(engine.canUndo()).toBe(false);
    expect(useImageEditorStore.getState()).toMatchObject({
      activeTool: "select",
      editingTextBlockId: null,
      textSelectionRange: null,
      editableBlockId: cover,
    });
  });

  it("rejects rendered image ZIPs without changing content, selection or redo", async () => {
    const { engine, engineRef, cover } = await createProjectFileFixture();
    engine.block.setName(cover, "Edited");
    engine.undo();
    engine.block.select(cover);
    const before = engine.document.saveToString();
    const bytes = zipSync({ "01-page.png": projectPng });
    await expect(prepareProjectFile(engineRef, bytes)).rejects.toBeInstanceOf(EditxArchiveError);
    expect(engine.document.saveToString()).toBe(before);
    expect(engine.block.isSelected(cover)).toBe(true);
    expect(engine.canRedo()).toBe(true);
  });

  it("rejects silent persisted mutations during asynchronous preview rendering", async () => {
    const { engine, engineRef, preview, cover } = await createProjectFileFixture();
    let finish!: (blob: Blob) => void;
    preview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = saveProject(engineRef);
    engine.beginSilent();
    engine.block.setName(cover, "Changed while saving");
    engine.endSilent();
    finish(new Blob([projectPng], { type: "image/png" }));
    await expect(saving).rejects.toThrow("document changed");
  });

  it("rejects a replaced engine while preview work is pending", async () => {
    const { engineRef, preview } = await createProjectFileFixture();
    let finish!: (blob: Blob) => void;
    preview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = saveProject(engineRef);
    engineRef.current = new EditxEngine();
    finish(new Blob([projectPng], { type: "image/png" }));
    await expect(saving).rejects.toThrow("editor changed");
  });

  it("checks a Blob's size before reading its bytes", async () => {
    const { engineRef } = await createProjectFileFixture();
    const file = new Blob(["oversized"]);
    vi.spyOn(file, "size", "get").mockReturnValue(32 * 1024 * 1024 + 1);
    const read = vi.spyOn(file, "arrayBuffer");
    await expect(prepareProjectFile(engineRef, file)).rejects.toThrow("32 MiB");
    expect(read).not.toHaveBeenCalled();
  });

  it("does not overwrite edits made while file bytes are being read", async () => {
    const { engine, engineRef, cover } = await createProjectFileFixture();
    const bytes = engine.document.saveToArchive();
    const file = new Blob([bytes]);
    let finish!: (value: ArrayBuffer) => void;
    vi.spyOn(file, "arrayBuffer").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const opening = prepareProjectFile(engineRef, file);
    engine.block.setName(cover, "Newer edit");
    finish(new Uint8Array(bytes).buffer);
    await expect(opening).rejects.toThrow("document changed");
    expect(engine.block.getName(cover)).toBe("Newer edit");
  });

  it("refuses replacement when the document changes during discard confirmation", async () => {
    const { engine, engineRef, cover } = await createProjectFileFixture();
    const file = await prepareProjectFile(engineRef, engine.document.saveToArchive());
    engine.block.setName(cover, "After confirmation opened");
    const load = vi.spyOn(engine.document, "loadFromArchive");
    await expect(loadPreparedProject(engineRef, file)).rejects.toThrow("document changed");
    expect(load).not.toHaveBeenCalled();
  });

  it("omits previews for page-less documents and clears stale page UI on open", async () => {
    const engine = new EditxEngine();
    const ref = { current: engine };
    const blob = await saveProject(ref);
    const archive = readEditxArchive(new Uint8Array(await blob.arrayBuffer()));
    expect(archive.preview).toBeUndefined();
    useImageEditorStore.setState({
      originalImage: { src: "old", name: "Old", width: 800, height: 600 },
      shownImageDimensions: { width: 800, height: 600, scale: 1 },
    });
    await loadPreparedProject(ref, await prepareProjectFile(ref, blob));
    expect(useImageEditorStore.getState()).toMatchObject({
      editableBlockId: null,
      originalImage: null,
      shownImageDimensions: null,
    });
  });

  it("does not silently omit an unavailable preview for a document with pages", async () => {
    const { engineRef, preview } = await createProjectFileFixture();
    preview.mockResolvedValueOnce(null);
    await expect(saveProject(engineRef)).rejects.toThrow("cannot create a project preview");
  });
});
