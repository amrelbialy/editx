import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { BlockData } from "./block/block.types";
import { EditxEngine } from "./editx-engine";

interface LegacyScene {
  version: number;
  blocks: BlockData[];
  activeSceneId: number | null;
  activePageId: number | null;
}

async function legacyFixture(version: 1 | 2 = 2) {
  const source = new EditxEngine();
  await source.scene.create();
  const first = source.scene.getCurrentPage()!;
  const selected = source.scene.addPage();
  const payload = JSON.parse(source.scene.saveToString()) as LegacyScene;
  payload.version = version;
  return { json: JSON.stringify(payload), first, selected };
}

describe("DocumentAPI compatibility and failures", () => {
  it.each([
    1, 2,
  ] as const)("loads raw scene v%i with a fresh identity and legacy page", async (version) => {
    const { json, selected } = await legacyFixture(version);
    const engine = new EditxEngine();
    const canonical = JSON.parse(engine.document.saveToString()) as {
      metadata: Record<string, unknown>;
    };
    canonical.metadata = { previous: true };
    await engine.document.loadFromString(JSON.stringify(canonical));
    const initialId = engine.document.getId();

    await engine.document.loadFromString(json);
    const firstLoadedId = engine.document.getId();
    expect(firstLoadedId).not.toBe(initialId);
    expect(engine.document.getMetadata()).toEqual({});
    expect(engine.document.getRootSceneId()).toBe(engine.scene.getScene());
    expect(engine.scene.getCurrentPage()).toBe(selected);

    await engine.document.loadFromString(json);
    expect(engine.document.getId()).not.toBe(firstLoadedId);
  });

  it("keeps scene v2 output compatible and resets identity through the legacy loader", async () => {
    const { json, selected } = await legacyFixture();
    const engine = new EditxEngine();
    const canonical = JSON.parse(engine.document.saveToString()) as {
      metadata: Record<string, unknown>;
    };
    canonical.metadata = { previous: true };
    await engine.document.loadFromString(JSON.stringify(canonical));
    const before = engine.document.getId();
    await engine.scene.loadFromString(json);
    const saved = JSON.parse(engine.scene.saveToString()) as LegacyScene;

    expect(Object.keys(saved)).toEqual(["version", "blocks", "activeSceneId", "activePageId"]);
    expect(saved.version).toBe(2);
    expect(saved.activePageId).toBe(selected);
    expect(engine.document.getId()).not.toBe(before);
    expect(engine.document.getRootSceneId()).toBe(saved.activeSceneId);
    expect(engine.document.getMetadata()).toEqual({});
  });

  it.each([
    ['{"kind":"other","schemaVersion":1}', "Unsupported document kind"],
    ['{"kind":"editx-document","schemaVersion":2}', "Unsupported document schema version"],
    [
      '{"kind":"editx-document","schemaVersion":1,"id":"","metadata":{},"scene":{"rootSceneId":null,"blocks":[]}}',
      "Document id",
    ],
    [
      '{"kind":"editx-document","schemaVersion":1,"id":"id","metadata":[],"scene":{"rootSceneId":null,"blocks":[]}}',
      "metadata",
    ],
    [
      '{"kind":"editx-document","schemaVersion":1,"id":"id","metadata":{"bad":1e400},"scene":{"rootSceneId":null,"blocks":[]}}',
      "finite",
    ],
  ])("rejects invalid document input before replacement", async (json, message) => {
    const engine = new EditxEngine();
    await engine.scene.create();
    engine.block.setName(engine.scene.getCurrentPage()!, "keep");
    const beforeId = engine.document.getId();
    const before = engine.document.saveToString();

    await expect(engine.document.loadFromString(json)).rejects.toThrow(message);

    expect(engine.document.getId()).toBe(beforeId);
    expect(engine.document.saveToString()).toBe(before);
    expect(engine.canUndo()).toBe(true);
  });

  it("rejects invalid canonical root navigation before replacement", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    const beforeId = engine.document.getId();
    const before = engine.document.saveToString();
    const payload = JSON.parse(before) as {
      id: string;
      scene: { rootSceneId: number | null };
    };
    payload.id = "incoming";
    payload.scene.rootSceneId = 9999;

    await expect(engine.document.loadFromString(JSON.stringify(payload))).rejects.toThrow(
      "Scene 9999",
    );
    expect(engine.document.getId()).toBe(beforeId);
    expect(engine.document.saveToString()).toBe(before);
  });

  it("preserves identity and state when JSON parsing fails", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    const beforeId = engine.document.getId();
    const before = engine.document.saveToString();

    await expect(engine.document.loadFromString("{")).rejects.toBeInstanceOf(SyntaxError);

    expect(engine.document.getId()).toBe(beforeId);
    expect(engine.document.saveToString()).toBe(before);
  });

  it("aligns incoming identity before navigation callbacks and renderer completion", async () => {
    const source = new EditxEngine();
    await source.scene.create();
    const payload = JSON.parse(source.document.saveToString()) as { id: string };
    payload.id = "incoming";
    let finish!: () => void;
    const renderer = createMockRenderer();
    renderer.createScene = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const target = new EditxEngine({ renderer });
    const callback = vi.fn(() => {
      expect(target.document.getId()).toBe("incoming");
    });
    target.onActivePageChanged(callback);

    const loading = target.document.loadFromString(JSON.stringify(payload));
    expect(target.document.getId()).toBe("incoming");
    expect(target.document.getRootSceneId()).toBe(source.document.getRootSceneId());
    expect(callback).toHaveBeenCalledOnce();
    finish();
    await loading;
  });

  it("retains replaced live state when renderer setup later rejects", async () => {
    const source = new EditxEngine();
    await source.scene.create();
    const payload = JSON.parse(source.document.saveToString()) as { id: string };
    payload.id = "replacement-before-render";
    const renderer = createMockRenderer();
    renderer.createScene = vi.fn().mockRejectedValue(new Error("renderer failed"));
    const target = new EditxEngine({ renderer });

    await expect(target.document.loadFromString(JSON.stringify(payload))).rejects.toThrow(
      "renderer failed",
    );
    expect(target.document.getId()).toBe("replacement-before-render");
    expect(target.scene.getScene()).toBe(source.scene.getScene());
  });
});
