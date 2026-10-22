import { EditxEngine } from "@editx/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectFileFixture } from "../__tests__/project-file-fixture";
import { createEditorHandle } from "./create-editor-handle";

afterEach(() => vi.restoreAllMocks());

describe("project methods on the editor handle", () => {
  it("round-trips an editable project without routing it through rendered-image export", async () => {
    const { engine, engineRef, cover } = await createProjectFileFixture();
    const handle = createEditorHandle(engine, engineRef);
    const scene = vi.spyOn(engine, "exportScene");
    const json = engine.document.saveToString();
    const project = await handle.saveProject();
    engine.scene.resizePage(cover, 320, 480);
    const info = await handle.loadProject(project);
    expect(info.manifest.selfContained).toBe(false);
    expect(engine.document.saveToString()).toBe(json);
    expect(scene).not.toHaveBeenCalled();
  });

  it("rejects stale handles without reading or replacing a different engine", async () => {
    const { engine, engineRef } = await createProjectFileFixture();
    const handle = createEditorHandle(engine, engineRef);
    engineRef.current = new EditxEngine();
    const before = engineRef.current.document.saveToString();
    await expect(handle.saveProject()).rejects.toThrow("stale");
    await expect(handle.loadProject(new Uint8Array())).rejects.toThrow("stale");
    expect(engineRef.current.document.saveToString()).toBe(before);
  });

  it("releases project input locking after a failed save", async () => {
    const { engine, engineRef, preview } = await createProjectFileFixture();
    const activity = vi.fn();
    const handle = createEditorHandle(engine, engineRef, activity);
    preview.mockRejectedValueOnce(new Error("preview failed"));
    await expect(handle.saveProject()).rejects.toThrow("preview failed");
    expect(activity.mock.calls).toEqual([[true], [false]]);
  });
});
