import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readLegacyMigrationFixture,
  readMigrationFixture,
} from "./__tests__/document-migration-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import * as documentIds from "./document-id";
import { EditxEngine } from "./editx-engine";

afterEach(() => vi.restoreAllMocks());

const versions = [1, 2] as const;
const loaders = ["document", "scene"] as const;
const pageCases = versions.flatMap((version) =>
  ["explicit", "absent", "null"].map((page) => ({ version, page })),
);
const sceneCases = versions.flatMap((version) =>
  ["absent", "null"].map((scene) => ({ version, scene })),
);

describe("migrated document loading", () => {
  it.each(pageCases)("preserves legacy v$version $page page behavior through both loaders", async ({
    version,
    page,
  }) => {
    const source = readLegacyMigrationFixture(version);
    if (page === "absent") delete source.activePageId;
    else source.activePageId = page === "null" ? null : 2;
    for (const loader of loaders) {
      const engine = new EditxEngine();
      const firstId = engine.document.getId();
      await engine[loader].loadFromString(JSON.stringify(source));
      const secondId = engine.document.getId();
      expect(secondId).not.toBe(firstId);
      expect(engine.document.getMetadata()).toEqual({});
      expect(engine.document.getRootSceneId()).toBe(0);
      expect(engine.scene.getCurrentPage()).toBe(page === "explicit" ? 2 : 10);
      await engine[loader].loadFromString(JSON.stringify(source));
      expect(engine.document.getId()).not.toBe(secondId);
    }
  });

  it.each(
    sceneCases,
  )("does not infer a root from legacy v$version with $scene scene navigation", async ({
    version,
    scene,
  }) => {
    const source = readLegacyMigrationFixture(version);
    if (scene === "absent") delete source.activeSceneId;
    else source.activeSceneId = null;
    delete source.activePageId;
    for (const loader of loaders) {
      const engine = new EditxEngine();
      await engine[loader].loadFromString(JSON.stringify(source));
      expect(engine.document.getRootSceneId()).toBeNull();
      expect(engine.scene.getScene()).toBeNull();
      expect(engine.scene.getCurrentPage()).toBeNull();
      expect(engine.block.isValid(0)).toBe(true);
    }
  });

  it.each(
    versions,
  )("preserves absent legacy v%i feature keys through load and save", async (version) => {
    const source = readLegacyMigrationFixture(version);
    const text = source.blocks.find((block) => block.id === 20)!;
    delete text.properties["text/curve/radius"];
    delete text.properties["text/curve/direction"];
    for (const loader of loaders) {
      const engine = new EditxEngine();
      await engine[loader].loadFromString(JSON.stringify(source));
      expect(engine.block.getFloat(20, "text/curve/radius")).toBe(0);
      expect(engine.block.getString(20, "text/fontFamily")).toBe("");
      expect(engine.block.getTextCurve(20)).toBeNull();
      const saved = JSON.parse(engine.document.saveToString());
      expect(saved.scene.blocks).toEqual(source.blocks);
      expect(saved).not.toHaveProperty("version");
      expect(saved).not.toHaveProperty("activePageId");
      expect(engine.canUndo()).toBe(false);
      expect(engine.block.create("graphic")).toBe(21);
      engine.undo();
      expect(JSON.parse(engine.document.saveToString()).scene.blocks).toEqual(source.blocks);
    }
  });

  it("preserves native identity, metadata and bytes without a schema bump", async () => {
    const source = readMigrationFixture("native-v1");
    const engine = new EditxEngine();
    await engine.document.loadFromString(JSON.stringify(source));
    expect(engine.document.getId()).toBe("golden-native-document");
    expect(engine.document.getMetadata()).toEqual({
      title: "Golden document",
      nested: { values: [1, true, null] },
    });
    expect(engine.scene.getCurrentPage()).toBe(10);
    expect(engine.block.getTextCurve(20)).toEqual({ radius: 120, direction: "down" });
    expect(engine.document.saveToString()).toBe(JSON.stringify(source));
    await expect(engine.scene.loadFromString(JSON.stringify(source))).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "MISSING_FIELD", path: ["version"] })],
    });
  });

  it.each(
    loaders,
  )("creates legacy identity only at %s replacement, before callbacks", async (loader) => {
    const engine = new EditxEngine();
    await engine.document.loadFromString(JSON.stringify(readMigrationFixture("native-v1")));
    const originalPrepare = engine._prepareSceneReplacement.bind(engine);
    const createId = vi.spyOn(documentIds, "createDocumentId");
    vi.spyOn(engine, "_prepareSceneReplacement").mockImplementation(() => {
      expect(createId).not.toHaveBeenCalled();
      originalPrepare();
    });
    const onChange = vi.fn(() => {
      expect(createId).toHaveBeenCalledOnce();
      expect(engine.document.getId()).not.toBe("golden-native-document");
      expect(engine.document.getMetadata()).toEqual({});
    });
    engine.onActivePageChanged(onChange);

    for (const version of versions) {
      createId.mockClear();
      await engine[loader].loadFromString(JSON.stringify(readLegacyMigrationFixture(version)));
      expect(createId).toHaveBeenCalledOnce();
    }
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("continues writing legacy v2 after a v1 migration", async () => {
    const engine = new EditxEngine();
    await engine.scene.loadFromString(JSON.stringify(readLegacyMigrationFixture(1)));
    const saved = JSON.parse(engine.scene.saveToString());
    expect(saved).toEqual({
      ...readLegacyMigrationFixture(1),
      version: 2,
      activeSceneId: 0,
      activePageId: 10,
    });
  });

  it.each(
    loaders,
  )("does not roll back migrated state on later %s renderer failure", async (loader) => {
    const renderer = createMockRenderer();
    renderer.createScene = vi.fn().mockRejectedValue(new Error("renderer failed"));
    const engine = new EditxEngine({ renderer });
    const initialId = engine.document.getId();
    await expect(
      engine[loader].loadFromString(JSON.stringify(readLegacyMigrationFixture(2))),
    ).rejects.toThrow("renderer failed");
    expect(engine.document.getId()).not.toBe(initialId);
    expect(engine.document.getMetadata()).toEqual({});
    expect(engine.document.getRootSceneId()).toBe(0);
    expect(engine.scene.getCurrentPage()).toBe(2);
    expect(engine.block.getName(20)).toBe("Headline");
  });
});
