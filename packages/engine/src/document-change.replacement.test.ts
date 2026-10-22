import { describe, expect, it, vi } from "vitest";
import { collectDocumentChanges, documentChangeFixture } from "./__tests__/document-change-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("replacement document events", () => {
  it("emits one create event rather than its intermediate commands", async () => {
    const engine = new EditxEngine();
    const events = collectDocumentChanges(engine);
    await engine.scene.create();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      transactionId: 1,
      origin: "create",
      changedBlockIds: [1, 2],
      affectedPageIds: [2],
      documentId: engine.document.getId(),
    });
  });

  it("suppresses identical native loads and key-order-only differences", async () => {
    const { engine } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    const payload = JSON.parse(engine.document.saveToString());
    for (const block of payload.scene.blocks)
      block.properties = Object.fromEntries(Object.entries(block.properties).reverse());
    await engine.document.loadFromString(JSON.stringify(payload));
    expect(events).toEqual([]);
    engine.block.setName(engine.scene.getCurrentPage()!, "real change");
    expect(events[0].transactionId).toBe(1);
  });

  it.each([
    "document",
    "scene",
  ] as const)("reports legacy %s imports with their fresh identity", async (loader) => {
    const { engine } = await documentChangeFixture();
    const json = engine.scene.saveToString();
    const events = collectDocumentChanges(engine);
    const oldId = engine.document.getId();
    await engine[loader].loadFromString(json);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      origin: "load",
      documentId: engine.document.getId(),
      changedBlockIds: [],
      affectedPageIds: [],
    });
    expect(events[0].documentId).not.toBe(oldId);
  });

  it("does not emit for invalid JSON, invalid schemas or invalid scene dimensions", async () => {
    const { engine } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    await expect(engine.document.loadFromString("{")).rejects.toBeInstanceOf(SyntaxError);
    await expect(
      engine.document.loadFromString('{"kind":"editx-document","schemaVersion":2}'),
    ).rejects.toThrow();
    await expect(engine.scene.create({ width: 0 })).rejects.toThrow();
    expect(events).toEqual([]);
  });

  it("emits post-replacement renderer failure before rejecting its promise", async () => {
    const renderer = createMockRenderer();
    const { engine } = await documentChangeFixture(renderer);
    const source = JSON.parse(engine.document.saveToString());
    source.id = "failed-render-load";
    const events = collectDocumentChanges(engine);
    const order: string[] = [];
    engine.document.onChanged(() => order.push("event"));
    renderer.createScene = vi.fn().mockRejectedValue(new Error("setup failed"));
    await engine.document.loadFromString(JSON.stringify(source)).catch((error) => {
      expect(error.message).toBe("setup failed");
      order.push("rejected");
    });
    expect(order).toEqual(["event", "rejected"]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      origin: "load",
      documentId: "failed-render-load",
      changedBlockIds: [],
    });
    expect(engine.document.getId()).toBe("failed-render-load");
  });

  it("reports created content retained after createScene rejects", async () => {
    const renderer = createMockRenderer();
    renderer.createScene = vi.fn().mockRejectedValue(new Error("create failed"));
    const engine = new EditxEngine({ renderer });
    const events = collectDocumentChanges(engine);
    await expect(engine.scene.create()).rejects.toThrow("create failed");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: "create", changedBlockIds: [1, 2] });
    expect(engine.document.getRootSceneId()).toBe(1);
  });

  it("folds awaited load/create into the caller's outer batch with final replacement origin", async () => {
    const { engine, x } = await documentChangeFixture();
    const source = JSON.parse(engine.document.saveToString());
    source.id = "batched-load";
    const events = collectDocumentChanges(engine);
    engine.beginBatch();
    engine.block.setName(x, "discarded");
    await engine.document.loadFromString(JSON.stringify(source));
    expect(events).toEqual([]);
    await engine.scene.create();
    expect(events).toEqual([]);
    engine.endBatch();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ origin: "create", documentId: "batched-load" });
    expect(events[0].changedBlockIds).not.toContain(x);
  });

  it("records renderer-time load corrections as part of that load", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const json = engine.document.saveToString();
    const events = collectDocumentChanges(engine);
    let corrected = false;
    renderer.syncBlock = vi.fn((id) => {
      if (id !== x || corrected) return;
      corrected = true;
      engine.beginSilent();
      try {
        engine.block.setName(x, "loaded correction");
      } finally {
        engine.endSilent();
      }
    });
    await engine.document.loadFromString(json);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ transactionId: 1, origin: "load", changedBlockIds: [x] });
  });
});
