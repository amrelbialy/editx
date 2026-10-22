import { afterEach, describe, expect, it, vi } from "vitest";
import {
  freezeMigrationFixture,
  migrationFixtures,
  readLegacyMigrationFixture,
  readMigrationFixture,
} from "./__tests__/document-migration-fixture";
import * as documentIds from "./document-id";
import {
  convertLegacySceneV2ToNativeLoad,
  migrateLegacySceneV1ToV2,
  prepareDocumentLoad,
  prepareLegacySceneLoad,
} from "./document-migration";
import { validateLegacyScene } from "./document-validation";

afterEach(() => vi.restoreAllMocks());

describe("forward document migration", () => {
  it.each(
    migrationFixtures,
  )("matches the %s golden without mutating input or generating identity", (name) => {
    const source = readMigrationFixture(name);
    const expected = readMigrationFixture(`${name}.expected`);
    const before = JSON.stringify(source);
    const createId = vi.spyOn(documentIds, "createDocumentId");
    freezeMigrationFixture(source);

    const first = prepareDocumentLoad(source);
    const second = prepareDocumentLoad(source);

    expect(first).toEqual(expected);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(source)).toBe(before);
    expect(createId).not.toHaveBeenCalled();
    if (name !== "native-v1") expect(prepareLegacySceneLoad(source)).toEqual(expected);
  });

  it("advances legacy v1 to v2 explicitly without adding feature defaults", () => {
    const source = validateLegacyScene(readMigrationFixture("legacy-scene-v1"));
    if (source.version !== 1) throw new Error("Expected a legacy v1 fixture");
    freezeMigrationFixture(source);
    const v2 = migrateLegacySceneV1ToV2(source);

    expect(v2.version).toBe(2);
    expect(v2.activeSceneId).toBe(0);
    expect(v2.activePageId).toBeNull();
    expect(v2.blocks).toBe(source.blocks);
    expect(source).not.toHaveProperty("activePageId");
    expect(convertLegacySceneV2ToNativeLoad(v2)).toEqual(
      readMigrationFixture("legacy-scene-v1.expected"),
    );
  });

  it("converges equivalent legacy v1/v2 content to the same latest-schema plan", () => {
    const source = readLegacyMigrationFixture(1);
    expect(prepareDocumentLoad(source)).toEqual(prepareDocumentLoad({ ...source, version: 2 }));
  });

  it.each([1, 2] as const)("does not infer a scene when legacy v%i omits navigation", (version) => {
    const source = readLegacyMigrationFixture(version);
    delete source.activeSceneId;
    delete source.activePageId;
    const result = prepareDocumentLoad(source);
    expect(result.scene.rootSceneId).toBeNull();
    expect(result.scene.blocks).toEqual(source.blocks);
    expect(result.navigation).toEqual({ sceneId: null, pageId: null });
  });

  it("keeps migration machinery out of the public SDK", async () => {
    const api = await import("./index");
    for (const name of [
      "prepareDocumentLoad",
      "prepareLegacySceneLoad",
      "migrateLegacySceneV1ToV2",
      "convertLegacySceneV2ToNativeLoad",
      "loadPreparedDocument",
    ]) {
      expect(api).not.toHaveProperty(name);
    }
  });
});
