import { unzipSync, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("archive rejection atomicity", () => {
  it("preserves document, selection, navigation, redo, renderer, and events", async () => {
    const renderer = createMockRenderer();
    const engine = new EditxEngine({ renderer });
    await engine.scene.create();
    const scene = engine.getActiveScene();
    const page = engine.getActivePage()!;
    const text = engine.block.addText(page, 0, 0, 100, 30, "keep");
    engine.block.setName(text, "redo me");
    engine.undo();
    engine.block.select(text);

    const entries = unzipSync(engine.document.saveToArchive());
    entries["assets/manifest.json"] = new TextEncoder().encode(
      JSON.stringify({
        kind: "editx-assets-manifest",
        schemaVersion: 1,
        dependencies: [{ unexpected: true }],
      }),
    );
    const invalid = zipSync(entries, {
      level: 9,
      mtime: new Date(1980, 0, 1),
      attrs: 0,
      os: 0,
    });
    const before = engine.document.saveToString();
    const selection = engine.block.findAllSelected();
    const prepare = vi.spyOn(engine, "_prepareSceneReplacement");
    const changed = vi.fn();
    engine.onActivePageChanged(changed);
    engine.onHistoryChanged(changed);
    engine.event.subscribe([], changed);
    for (const method of Object.values(renderer)) {
      if (vi.isMockFunction(method)) method.mockClear();
    }

    await expect(engine.document.loadFromArchive(invalid)).rejects.toMatchObject({
      code: "INVALID_MANIFEST",
      entryPath: "assets/manifest.json",
    });

    expect(engine.document.saveToString()).toBe(before);
    expect(engine.getActiveScene()).toBe(scene);
    expect(engine.getActivePage()).toBe(page);
    expect(engine.block.findAllSelected()).toEqual(selection);
    expect(engine.canRedo()).toBe(true);
    expect(prepare).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    for (const method of Object.values(renderer)) {
      if (vi.isMockFunction(method)) expect(method).not.toHaveBeenCalled();
    }
    engine.redo();
    expect(engine.block.getName(text)).toBe("redo me");
  });
});
