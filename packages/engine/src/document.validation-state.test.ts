import { describe, expect, it, vi } from "vitest";
import { documentFixture } from "./__tests__/document-validation-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { DocumentValidationError } from "./document-validation-error";
import { EditxEngine } from "./editx-engine";

describe("validation before replacement", () => {
  it.each([
    "kind",
    "schemaVersion",
    "version",
  ])("does not coerce malformed %s headers while reporting structured errors", async (field) => {
    const { engine, document } = await documentFixture();
    const payload = field === "version" ? JSON.parse(engine.scene.saveToString()) : document;
    Reflect.set(payload, field, JSON.parse('{"toString":null}'));
    const before = engine.document.saveToString();
    await expect(engine.document.loadFromString(JSON.stringify(payload))).rejects.toMatchObject({
      name: "DocumentValidationError",
      issues: [
        expect.objectContaining({
          code: field === "kind" ? "UNSUPPORTED_KIND" : "UNSUPPORTED_VERSION",
          path: [field],
        }),
      ],
    });
    expect(engine.document.saveToString()).toBe(before);
  });

  it.each([
    "canonical",
    "canonical-legacy",
    "legacy",
  ] as const)("preserves live state, redo, editing, events, renderer and allocation on %s graph failure", async (format) => {
    const source = await documentFixture();
    source.block(source.ids.graphic).fillId = 9999;
    const json =
      format === "canonical"
        ? JSON.stringify(source.document)
        : JSON.stringify({
            version: 2,
            blocks: source.document.scene.blocks,
            activeSceneId: source.ids.scene,
            activePageId: source.ids.page,
          });
    const renderer = createMockRenderer();
    const target = new EditxEngine({ renderer });
    await target.scene.create();
    const page = target.scene.getCurrentPage()!;
    const text = target.block.addText(page, 0, 0, 100, 30, "Keep me");
    target.block.setName(text, "Redo me");
    target.undo();
    target.block.select(text);
    target.editor.setEditMode("Crop", { blockId: page });
    const before = target.document.saveToString();
    const selection = target.block.findAllSelected();
    const mode = target.editor.getEditMode();
    const canUndo = target.canUndo();
    const maxId = Math.max(...target._getBlockStore().getAllBlockIds());
    const prepare = vi.spyOn(target, "_prepareSceneReplacement");
    const changed = vi.fn();
    target.onActivePageChanged(changed);
    target.onPageOrderChanged(changed);
    target.onHistoryChanged(changed);
    target.on("history:clear", changed);
    target.event.subscribe([], changed);
    for (const method of Object.values(renderer)) if (vi.isMockFunction(method)) method.mockClear();

    const loading =
      format === "legacy"
        ? target.scene.loadFromString(json)
        : target.document.loadFromString(json);
    await expect(loading).rejects.toBeInstanceOf(DocumentValidationError);

    expect(target.document.saveToString()).toBe(before);
    expect(target.canUndo()).toBe(canUndo);
    expect(target.canRedo()).toBe(true);
    expect(target.block.findAllSelected()).toEqual(selection);
    expect(target.editor.getEditMode()).toBe(mode);
    expect(changed).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    for (const method of Object.values(renderer))
      if (vi.isMockFunction(method)) expect(method).not.toHaveBeenCalled();
    target.redo();
    expect(target.block.getName(text)).toBe("Redo me");
    expect(target.block.create("text")).toBe(maxId + 1);
  });

  it.each([1, 2])("validates legacy v%i references through both entry points", async (version) => {
    const { engine } = await documentFixture();
    const payload = JSON.parse(engine.scene.saveToString());
    payload.version = version;
    payload.activePageId = 9999;
    const json = JSON.stringify(payload);
    for (const loader of [engine.document, engine.scene]) {
      await expect(loader.loadFromString(json)).rejects.toMatchObject({
        issues: [
          expect.objectContaining({ code: "MISSING_BLOCK_REFERENCE", path: ["activePageId"] }),
        ],
      });
    }
  });

  it("retains native SyntaxError for malformed JSON through both entry points", async () => {
    const { engine } = await documentFixture();
    const before = engine.document.saveToString();
    for (const loader of [engine.document, engine.scene]) {
      await expect(loader.loadFromString("{")).rejects.toBeInstanceOf(SyntaxError);
      expect(engine.document.saveToString()).toBe(before);
    }
  });

  it("allows legacy missing active IDs and absent feature property keys", async () => {
    const { engine } = await documentFixture();
    const payload = JSON.parse(engine.scene.saveToString());
    payload.version = 1;
    delete payload.activePageId;
    const page = engine.scene.getPages()[0];
    for (const block of payload.blocks) block.properties = {};
    await engine.document.loadFromString(JSON.stringify(payload));
    expect(engine.scene.getCurrentPage()).toBe(page);
    expect(engine.block.getFloat(page, "page/width")).toBe(0);
    delete payload.activeSceneId;
    await engine.scene.loadFromString(JSON.stringify(payload));
    expect(engine.scene.getScene()).toBeNull();
    expect(engine.scene.getCurrentPage()).toBeNull();
  });
});
