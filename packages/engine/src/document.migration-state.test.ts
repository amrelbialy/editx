import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readLegacyMigrationFixture,
  readMigrationFixture,
} from "./__tests__/document-migration-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import * as documentIds from "./document-id";
import * as migration from "./document-migration";
import { isRecord } from "./document-validation-context";
import { DocumentValidationError } from "./document-validation-error";
import { EditxEngine } from "./editx-engine";

afterEach(() => vi.restoreAllMocks());

const failures = [
  { format: "native-v1", loader: "document", failure: "version" },
  { format: "legacy-scene-v1", loader: "document", failure: "version" },
  { format: "legacy-scene-v2", loader: "document", failure: "version" },
  { format: "legacy-scene-v1", loader: "scene", failure: "version" },
  { format: "legacy-scene-v2", loader: "scene", failure: "version" },
  { format: "legacy-scene-v1", loader: "document", failure: "migration" },
  { format: "legacy-scene-v1", loader: "scene", failure: "migration" },
] as const;

describe("migration before live replacement", () => {
  it.each(failures)("preserves all live state on $format $loader $failure failure", async ({
    format,
    loader,
    failure,
  }) => {
    const source = readMigrationFixture(format);
    if (!isRecord(source)) throw new Error("Expected an object fixture");
    const versionKey = format === "native-v1" ? "schemaVersion" : "version";
    if (failure === "version") {
      source[versionKey] = format === "native-v1" ? 2 : 3;
      if (format === "native-v1") {
        source.version = 2;
        source.blocks = readLegacyMigrationFixture(2).blocks;
        source.activeSceneId = 0;
      }
    }
    const renderer = createMockRenderer();
    const engine = new EditxEngine({ renderer });
    await engine.scene.create();
    const page = engine.scene.getCurrentPage()!;
    const text = engine.block.addText(page, 0, 0, 100, 30, "Keep me");
    engine.block.setName(text, "Keep redo");
    engine.undo();
    engine.block.select(text);
    engine.editor.setEditMode("Crop", { blockId: page });
    const before = engine.document.saveToString();
    const selection = engine.block.findAllSelected();
    const mode = engine.editor.getEditMode();
    const maxId = Math.max(...engine._getBlockStore().getAllBlockIds());
    const prepare = vi.spyOn(engine, "_prepareSceneReplacement");
    const createId = vi.spyOn(documentIds, "createDocumentId");
    const restore = vi.spyOn(engine._getBlockStore(), "restore");
    const changed = vi.fn();
    engine.onActivePageChanged(changed);
    engine.onHistoryChanged(changed);
    engine.event.subscribe([], changed);
    for (const method of Object.values(renderer)) if (vi.isMockFunction(method)) method.mockClear();

    if (failure === "migration") {
      const entry = loader === "document" ? "prepareDocumentLoad" : "prepareLegacySceneLoad";
      vi.spyOn(migration, entry).mockImplementationOnce(() => {
        throw new Error("migration failed");
      });
      await expect(engine[loader].loadFromString(JSON.stringify(source))).rejects.toThrow(
        "migration failed",
      );
    } else {
      await expect(engine[loader].loadFromString(JSON.stringify(source))).rejects.toMatchObject({
        name: "DocumentValidationError",
        issues: [expect.objectContaining({ code: "UNSUPPORTED_VERSION", path: [versionKey] })],
      });
    }

    expect(engine.document.saveToString()).toBe(before);
    expect(engine.block.findAllSelected()).toEqual(selection);
    expect(engine.editor.getEditMode()).toBe(mode);
    expect(engine.canRedo()).toBe(true);
    expect(createId).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    for (const method of Object.values(renderer))
      if (vi.isMockFunction(method)) expect(method).not.toHaveBeenCalled();
    engine.redo();
    expect(engine.block.getName(text)).toBe("Keep redo");
    expect(engine.block.create("graphic")).toBe(maxId + 1);
  });

  it.each([
    1, 2,
  ] as const)("preserves original legacy v%i reference error paths", async (version) => {
    const source = readLegacyMigrationFixture(version);
    delete source.activeSceneId;
    source.activePageId = 2;
    for (const loader of ["document", "scene"] as const) {
      await expect(
        new EditxEngine()[loader].loadFromString(JSON.stringify(source)),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({ code: "INVALID_BLOCK_OWNERSHIP", path: ["activePageId"] }),
        ],
      });
    }
  });

  it("does not rewrite property paths into native-envelope paths during migration", () => {
    const source = readLegacyMigrationFixture(1);
    const text = source.blocks.find((block) => block.id === 20)!;
    text.properties["text/runs"] = [{ text: "bad", style: { fontSize: Number.POSITIVE_INFINITY } }];
    try {
      migration.prepareDocumentLoad(source);
      expect.unreachable("Malformed properties must reject before migration");
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentValidationError);
      expect(error).toMatchObject({
        issues: [
          expect.objectContaining({
            code: "INVALID_FIELD",
            blockId: 20,
            path: ["blocks", 3, "properties", "text/runs", 0, "style", "fontSize"],
          }),
        ],
      });
    }
  });
});
