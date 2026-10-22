import { describe, expect, it, vi } from "vitest";
import { collectDocumentChanges, documentChangeFixture } from "./__tests__/document-change-fixture";
import { samePersistedValue } from "./document-change-equality";

describe("document transactions", () => {
  it("emits headlessly for real edits, silent writes, undo and redo", async () => {
    const { engine, first, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    engine.beginSilent();
    engine.block.setName(x, "silent");
    engine.endSilent();
    expect(engine.canUndo()).toBe(false);
    engine.block.setName(x, "edit");
    engine.undo();
    engine.redo();
    expect(events.map((event) => [event.transactionId, event.origin])).toEqual([
      [1, "edit"],
      [2, "edit"],
      [3, "undo"],
      [4, "redo"],
    ]);
    for (const event of events) {
      expect(event.documentId).toBe(engine.document.getId());
      expect(event.changedBlockIds).toEqual([x]);
      expect(event.affectedPageIds).toEqual([first]);
    }
  });

  it("coalesces nested batches, duplicate IDs, silent edits and history replay", async () => {
    const { engine, first, second, x, y } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    engine.beginBatch();
    engine.block.setName(x, "a");
    engine.beginBatch();
    engine.block.setName(x, "b");
    engine.block.setName(y, "c");
    engine.endBatch();
    engine.beginSilent();
    engine.block.setString(x, "plugin/value", "silent");
    engine.endSilent();
    expect(events).toEqual([]);
    engine.endBatch();
    expect(events).toHaveLength(1);
    expect(events[0].changedBlockIds).toEqual([x, y]);
    expect(events[0].affectedPageIds).toEqual([first, second]);
    engine.undo();
    expect(events[1].origin).toBe("undo");
    expect(events[1].changedBlockIds).toEqual([y, x]);
  });

  it("suppresses same-value, empty history, and net-zero batches without consuming IDs", async () => {
    const { engine, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    engine.undo();
    engine.redo();
    const original = engine.block.getName(x);
    engine.block.setName(x, original);
    engine.beginBatch();
    engine.block.setName(x, "temporary");
    engine.block.setName(x, original);
    const temporary = engine.block.create("graphic");
    engine.block.destroy(temporary);
    engine.endBatch();
    expect(events).toEqual([]);
    engine.block.setName(x, "real");
    expect(events.map((event) => event.transactionId)).toEqual([1]);
  });

  it("publishes defensive frozen values and supports idempotent unsubscribe", async () => {
    const { engine, x } = await documentChangeFixture();
    const callback = vi.fn();
    const unsubscribe = engine.document.onChanged(callback);
    engine.block.setName(x, "one");
    const event = callback.mock.calls[0][0];
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.changedBlockIds)).toBe(true);
    expect(Object.isFrozen(event.affectedPageIds)).toBe(true);
    expect(Reflect.set(event.changedBlockIds, 0, -1)).toBe(false);
    expect(Reflect.set(event, "origin", "bad")).toBe(false);
    unsubscribe();
    unsubscribe();
    engine.block.setName(x, "two");
    expect(callback).toHaveBeenCalledOnce();
  });

  it("starts later transactions for subscriber writes, without recursive delivery", async () => {
    const { engine, x, y } = await documentChangeFixture();
    const order: string[] = [];
    engine.document.onChanged((event) => {
      order.push(`A${event.transactionId}`);
      if (event.transactionId === 1) engine.block.setName(y, "nested");
    });
    engine.document.onChanged((event) => order.push(`B${event.transactionId}`));
    engine.block.setName(x, "start");
    expect(order).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("surfaces subscriber errors without rolling back or locking future transactions", async () => {
    const { engine, x } = await documentChangeFixture();
    const stop = engine.document.onChanged(() => {
      stop();
      throw new Error("observer failed");
    });
    expect(() => engine.block.setName(x, "retained")).toThrow("observer failed");
    expect(engine.block.getName(x)).toBe("retained");
    const events = collectDocumentChanges(engine);
    engine.block.setName(x, "next");
    expect(events.map((event) => event.transactionId)).toEqual([2]);
  });

  it("reports residual mutations before command failure and suppresses rolled-back failures", async () => {
    const { engine, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    const store = engine._getBlockStore();
    const before = store.snapshot(x)!;
    expect(() =>
      engine.exec({
        do() {
          store.setName(x, "rolled back");
          store.restore(before);
          throw new Error("rolled back");
        },
      }),
    ).toThrow("rolled back");
    expect(events).toEqual([]);
    expect(() =>
      engine.exec({
        do() {
          store.setName(x, "partial");
          throw new Error("partial failure");
        },
      }),
    ).toThrow("partial failure");
    expect(events).toHaveLength(1);
    expect(events[0].changedBlockIds).toEqual([x]);
    expect(engine.canUndo()).toBe(false);
  });

  it("does not serialize or enumerate the whole store for an ordinary edit", async () => {
    const { engine, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    const serialize = vi.spyOn(engine.document, "saveToString");
    const enumerate = vi.spyOn(engine._getBlockStore(), "getAllBlockIds");
    engine.block.setName(x, "incremental");
    expect(events).toHaveLength(1);
    expect(serialize).not.toHaveBeenCalled();
    expect(enumerate).not.toHaveBeenCalled();
  });

  it("folds undo and redo into an explicit edit batch and suppresses net-zero replay", async () => {
    const { engine, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    engine.block.setName(x, "recorded");
    engine.beginBatch();
    engine.undo();
    expect(events).toHaveLength(1);
    engine.endBatch();
    engine.beginBatch();
    engine.redo();
    engine.endBatch();
    expect(events.map((event) => [event.transactionId, event.origin])).toEqual([
      [1, "edit"],
      [2, "edit"],
      [3, "edit"],
    ]);
    expect(events.every((event) => event.changedBlockIds.length === 1)).toBe(true);
    engine.beginBatch();
    engine.undo();
    engine.redo();
    engine.endBatch();
    expect(events).toHaveLength(3);
  });

  it("ignores object-key order and unpersisted fields but preserves array positions", () => {
    expect(samePersistedValue({ a: 1, z: undefined }, { a: 1 })).toBe(true);
    expect(samePersistedValue({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(samePersistedValue([1, 2], [2, 1])).toBe(false);
    expect(samePersistedValue([undefined], [])).toBe(false);
    expect(samePersistedValue([undefined], [null])).toBe(false);
  });
});
