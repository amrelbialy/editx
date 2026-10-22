import { describe, expect, it, vi } from "vitest";
import { collectDocumentChanges, documentChangeFixture } from "./__tests__/document-change-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";

describe("asynchronous document change ownership", () => {
  it("keeps a host edit separate from a pending create operation", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const events = collectDocumentChanges(engine);
    let resolve!: () => void;
    renderer.createScene = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const creating = engine.scene.create();
    expect(events).toEqual([]);
    engine.block.setName(x, "concurrent with create");
    expect(events).toHaveLength(1);
    resolve();
    await creating;
    expect(events.map((event) => [event.transactionId, event.origin])).toEqual([
      [1, "edit"],
      [2, "create"],
    ]);
    expect(events[0].changedBlockIds).toEqual([x]);
    expect(events[1].changedBlockIds).not.toContain(x);
    expect(engine.block.getName(x)).toBe("concurrent with create");
  });

  it("keeps a concurrent edit separate from an identical pending native reload", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const json = engine.document.saveToString();
    const events = collectDocumentChanges(engine);
    let resolve!: () => void;
    renderer.createScene = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const loading = engine.document.loadFromString(json);
    expect(events).toEqual([]);
    engine.block.setName(x, "concurrent");
    expect(events).toHaveLength(1);
    resolve();
    await loading;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ transactionId: 1, origin: "edit", changedBlockIds: [x] });
    expect(engine.block.getName(x)).toBe("concurrent");
  });

  it("does not cross-attribute same-identity metadata replacements or owned corrections", async () => {
    const renderer = createMockRenderer();
    const { engine, y, z } = await documentChangeFixture(renderer);
    const source = JSON.parse(engine.document.saveToString());
    const events = collectDocumentChanges(engine);
    const pending: (() => void)[] = [];
    renderer.createScene = vi.fn(() => new Promise<void>((resolve) => pending.push(resolve)));
    const first = engine.document.loadFromString(
      JSON.stringify({ ...source, metadata: { revision: 1 } }),
    );
    const second = engine.document.loadFromString(
      JSON.stringify({ ...source, metadata: { revision: 2 } }),
    );
    let correcting = 2;
    const corrected = new Set<number>();
    renderer.syncBlock = vi.fn((id) => {
      const target = correcting === 2 ? y : z;
      if (id !== target || corrected.has(target)) return;
      corrected.add(target);
      engine.beginSilent();
      try {
        engine.block.setName(target, `load ${correcting}`);
      } finally {
        engine.endSilent();
      }
    });
    pending[1]();
    await second;
    correcting = 1;
    pending[0]();
    await first;
    expect(
      events.map((event) => [event.transactionId, event.origin, event.changedBlockIds]),
    ).toEqual([
      [1, "load", [y]],
      [2, "load", [z]],
    ]);
    expect(engine.document.getMetadata()).toEqual({ revision: 2 });
  });

  it("delivers an old pending load with its captured identity, not the newer document's edits", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const source = JSON.parse(engine.document.saveToString());
    const events = collectDocumentChanges(engine);
    const pending: (() => void)[] = [];
    renderer.createScene = vi.fn(() => new Promise<void>((resolve) => pending.push(resolve)));
    const first = engine.document.loadFromString(JSON.stringify({ ...source, id: "document-one" }));
    const second = engine.document.loadFromString(
      JSON.stringify({ ...source, id: "document-two" }),
    );
    pending[1]();
    await second;
    engine.block.setName(x, "newer edit");
    pending[0]();
    await first;
    expect(events.map((event) => [event.transactionId, event.origin, event.documentId])).toEqual([
      [1, "load", "document-two"],
      [2, "edit", "document-two"],
      [3, "load", "document-one"],
    ]);
    expect(events[2].changedBlockIds).toEqual([]);
    expect(engine.document.getId()).toBe("document-two");
  });

  it("does not swallow corrections after a caller ends its batch before a load settles", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const source = JSON.parse(engine.document.saveToString());
    source.id = "early-ended-batch";
    const events = collectDocumentChanges(engine);
    let resolve!: () => void;
    renderer.createScene = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    let corrected = false;
    renderer.syncBlock = vi.fn((id) => {
      if (id !== x || corrected) return;
      corrected = true;
      engine.beginSilent();
      try {
        engine.block.setName(x, "late correction");
      } finally {
        engine.endSilent();
      }
    });
    engine.beginBatch();
    const loading = engine.document.loadFromString(JSON.stringify(source));
    engine.endBatch();
    expect(events).toHaveLength(1);
    resolve();
    await loading;
    expect(events.map((event) => [event.transactionId, event.origin])).toEqual([
      [1, "load"],
      [2, "edit"],
    ]);
    expect(events[1].changedBlockIds).toEqual([x]);
  });
});
