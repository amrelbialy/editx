import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { BlockData } from "./block/block.types";
import {
  EDITX_DOCUMENT_KIND,
  EDITX_DOCUMENT_SCHEMA_VERSION,
  type EditxDocumentV1,
} from "./document-types";
import { EditxEngine } from "./editx-engine";

function readDocument(engine: EditxEngine): EditxDocumentV1 {
  return JSON.parse(engine.document.saveToString()) as EditxDocumentV1;
}

describe("DocumentAPI serialization", () => {
  it("emits the exact v1 envelope and produces byte-stable saves", async () => {
    const engine = new EditxEngine();
    const id = engine.document.getId();
    expect(engine.document.saveToString()).toBe(
      JSON.stringify({
        kind: "editx-document",
        schemaVersion: 1,
        id,
        metadata: {},
        scene: { rootSceneId: null, blocks: [] },
      }),
    );
    expect(EDITX_DOCUMENT_KIND).toBe("editx-document");
    expect(EDITX_DOCUMENT_SCHEMA_VERSION).toBe(1);

    await engine.scene.create();
    const first = engine.document.saveToString();
    expect(engine.document.saveToString()).toBe(first);
    expect(readDocument(engine).scene).not.toHaveProperty("version");
  });

  it("retains document identity while scene.create replaces the authored root", async () => {
    const engine = new EditxEngine();
    const id = engine.document.getId();
    await engine.scene.create();
    const firstRoot = engine.document.getRootSceneId();
    await engine.scene.create();
    expect(engine.document.getId()).toBe(id);
    expect(engine.document.getRootSceneId()).not.toBe(firstRoot);
    expect(engine.document.getRootSceneId()).toBe(engine.scene.getScene());
  });

  it("resolves the authored root across command destroy, undo, and redo", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    const runtimeScene = engine.scene.getScene()!;
    await engine.scene.create();
    const authoredRoot = engine.document.getRootSceneId()!;
    engine.setActiveScene(runtimeScene);

    engine.block.destroy(authoredRoot);
    const destroyed = engine.document.saveToString();
    expect(engine.scene.getScene()).toBe(runtimeScene);
    expect(engine.document.getRootSceneId()).toBeNull();
    expect(readDocument(engine).scene.rootSceneId).toBeNull();
    const restored = new EditxEngine();
    await restored.document.loadFromString(destroyed);
    expect(restored.document.saveToString()).toBe(destroyed);
    expect(restored.document.getRootSceneId()).toBeNull();

    engine.undo();
    expect(engine.scene.getScene()).toBe(runtimeScene);
    expect(engine.document.getRootSceneId()).toBe(authoredRoot);
    expect(readDocument(engine).scene.rootSceneId).toBe(authoredRoot);
    expect(engine.document.saveToString()).not.toBe(destroyed);

    engine.redo();
    expect(engine.scene.getScene()).toBe(runtimeScene);
    expect(engine.document.getRootSceneId()).toBeNull();
    expect(readDocument(engine).scene.rootSceneId).toBeNull();
    expect(engine.document.saveToString()).toBe(destroyed);
  });

  it("excludes runtime navigation, selection, camera, and page-view state", async () => {
    const renderer = createMockRenderer();
    renderer.setPageView = vi.fn();
    renderer.getPageViewBounds = vi.fn().mockReturnValue(null);
    const engine = new EditxEngine({ renderer });
    await engine.scene.create();
    const oldScene = engine.scene.getScene()!;
    const oldPage = engine.scene.getCurrentPage()!;
    await engine.scene.create();
    const root = engine.document.getRootSceneId();
    const before = engine.document.saveToString();

    engine.setActiveScene(oldScene);
    engine.scene.setActivePage(oldPage);
    engine.block.select(oldPage);
    engine.editor.setPageViewMode("vertical-pages");
    engine.editor.setZoom(1.5);
    engine.editor.panTo(20, 30);
    await engine.exportPage(oldPage, { format: "png" });

    expect(engine.document.getRootSceneId()).toBe(root);
    expect(engine.document.saveToString()).toBe(before);
  });

  it("includes authored visibility and block mutations", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    const page = engine.scene.getCurrentPage()!;
    const before = engine.document.saveToString();
    engine.block.setVisible(page, false);
    const hidden = engine.document.saveToString();
    expect(hidden).not.toBe(before);
    engine.block.setName(page, "Renamed");
    expect(engine.document.saveToString()).not.toBe(hidden);
  });

  it("loads canonical identity and metadata, then navigates to the first root page", async () => {
    const source = new EditxEngine();
    await source.scene.create();
    const first = source.scene.getCurrentPage()!;
    source.scene.addPage();
    const payload = readDocument(source) as unknown as {
      id: string;
      metadata: Record<string, unknown>;
    };
    payload.id = "document-from-host";
    payload.metadata = { nested: { tags: ["editable", null], score: 2 } };
    const json = JSON.stringify(payload);
    const target = new EditxEngine();
    await target.scene.create();
    target.scene.addPage();
    target.block.setName(target.scene.getCurrentPage()!, "undoable");
    const callback = vi.fn(() => {
      expect(target.document.getId()).toBe("document-from-host");
    });
    target.onActivePageChanged(callback);

    await target.document.loadFromString(json);

    expect(target.document.getId()).toBe("document-from-host");
    expect(target.document.getRootSceneId()).toBe(source.document.getRootSceneId());
    expect(target.scene.getCurrentPage()).toBe(first);
    expect(target.document.getMetadata()).toEqual(payload.metadata);
    expect(target.document.saveToString()).toBe(json);
    expect(target.canUndo()).toBe(false);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("returns independent, deeply frozen metadata snapshots", async () => {
    const engine = new EditxEngine();
    const payload = readDocument(engine) as unknown as {
      metadata: Record<string, unknown>;
    };
    payload.metadata = { nested: { values: [1, { enabled: true }] } };
    await engine.document.loadFromString(JSON.stringify(payload));
    const first = engine.document.getMetadata();
    const second = engine.document.getMetadata();

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.nested)).toBe(true);
    const nested = first.nested as { readonly values: readonly unknown[] };
    expect(Object.isFrozen(nested.values)).toBe(true);
    expect(Object.isFrozen(nested.values[1])).toBe(true);

    const id = engine.document.getId();
    await engine.scene.create();
    expect(engine.document.getId()).toBe(id);
    expect(engine.document.getMetadata()).toEqual(payload.metadata);
  });

  it.each([
    "empty",
    "page-less-root",
  ] as const)("clears rendered content when loading a canonical %s document", async (kind) => {
    const rendered = new Set<number>();
    const renderer = createMockRenderer();
    renderer.syncBlock = vi.fn((id) => rendered.add(id));
    renderer.removeBlock = vi.fn((id) => rendered.delete(id));
    const engine = new EditxEngine({ renderer });
    await engine.scene.create();
    const previousIds = engine._getBlockStore().getAllBlockIds();
    expect(rendered.size).toBeGreaterThan(0);

    const payload = JSON.parse(
      kind === "empty" ? new EditxEngine().document.saveToString() : engine.document.saveToString(),
    ) as {
      scene: { rootSceneId: number | null; blocks: BlockData[] };
    };
    if (kind === "page-less-root") {
      const rootSceneId = payload.scene.rootSceneId!;
      const root = payload.scene.blocks.find((block) => block.id === rootSceneId)!;
      root.children = [];
      payload.scene.blocks = [root];
    }
    vi.mocked(renderer.createScene).mockClear();
    vi.mocked(renderer.removeBlock).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();

    await engine.document.loadFromString(JSON.stringify(payload));

    expect(rendered).toEqual(new Set());
    expect(vi.mocked(renderer.removeBlock).mock.calls.map(([id]) => id)).toEqual(previousIds);
    expect(renderer.createScene).not.toHaveBeenCalled();
    expect(renderer.renderFrame).toHaveBeenCalledOnce();
    expect(engine.scene.getCurrentPage()).toBeNull();
    expect(engine.scene.getScene()).toBe(kind === "empty" ? null : payload.scene.rootSceneId);
  });
});
