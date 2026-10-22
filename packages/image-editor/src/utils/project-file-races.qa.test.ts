import { EditxEngine, readEditxArchive } from "@editx/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectFileFixture, projectPng } from "../__tests__/project-file-fixture";
import { loadPreparedProject, prepareProjectFile, saveProject } from "./project-file";

afterEach(() => vi.restoreAllMocks());

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("project file asynchronous race boundaries", () => {
  it("rejects a document mutation while preview Blob bytes are pending", async () => {
    const { engine, engineRef, preview, cover } = await createProjectFileFixture();
    const bytes = deferred<ArrayBuffer>();
    const blob = new Blob([projectPng], { type: "image/png" });
    const read = vi.spyOn(blob, "arrayBuffer").mockImplementationOnce(() => bytes.promise);
    preview.mockResolvedValueOnce(blob);

    const saving = saveProject(engineRef);
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    engine.block.setName(cover, "edit during Blob read");
    bytes.resolve(new Uint8Array(projectPng).buffer);

    await expect(saving).rejects.toThrow("document changed");
  });

  it("rejects an engine replacement while preview Blob bytes are pending", async () => {
    const { engineRef, preview } = await createProjectFileFixture();
    const bytes = deferred<ArrayBuffer>();
    const blob = new Blob([projectPng], { type: "image/png" });
    const read = vi.spyOn(blob, "arrayBuffer").mockImplementationOnce(() => bytes.promise);
    preview.mockResolvedValueOnce(blob);

    const saving = saveProject(engineRef);
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    engineRef.current = new EditxEngine();
    bytes.resolve(new Uint8Array(projectPng).buffer);

    await expect(saving).rejects.toThrow("editor changed");
  });

  it("does not cross-contaminate guards between editor instances", async () => {
    const first = await createProjectFileFixture();
    const second = await createProjectFileFixture();
    const preview = deferred<Blob>();
    first.preview.mockImplementationOnce(() => preview.promise);

    const saving = saveProject(first.engineRef);
    second.engine.block.setName(second.cover, "unrelated edit");
    preview.resolve(new Blob([projectPng], { type: "image/png" }));

    await expect(saving).resolves.toMatchObject({ type: "application/vnd.editx+zip" });
  });

  it("rejects engine replacement while an opening Blob is being read", async () => {
    const { engine, engineRef } = await createProjectFileFixture();
    const archive = engine.document.saveToArchive();
    const source = new Blob([new Uint8Array(archive)]);
    const bytes = deferred<ArrayBuffer>();
    const read = vi.spyOn(source, "arrayBuffer").mockImplementationOnce(() => bytes.promise);

    const opening = prepareProjectFile(engineRef, source);
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    engineRef.current = new EditxEngine();
    bytes.resolve(new Uint8Array(archive).buffer);

    await expect(opening).rejects.toThrow("editor changed");
  });

  it("rejects engine replacement while validated project installation is pending", async () => {
    const { engine, engineRef } = await createProjectFileFixture();
    const archiveBytes = engine.document.saveToArchive();
    const file = await prepareProjectFile(engineRef, archiveBytes);
    const result = readEditxArchive(archiveBytes);
    const loading = deferred<Awaited<ReturnType<typeof engine.document.loadFromArchive>>>();
    const load = vi
      .spyOn(engine.document, "loadFromArchive")
      .mockImplementationOnce(() => loading.promise);

    const opening = loadPreparedProject(engineRef, file);
    expect(load).toHaveBeenCalledOnce();
    engineRef.current = new EditxEngine();
    loading.resolve(result);

    await expect(opening).rejects.toThrow("editor changed");
  });
});
