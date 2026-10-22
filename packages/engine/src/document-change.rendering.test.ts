import { describe, expect, it, vi } from "vitest";
import { collectDocumentChanges, documentChangeFixture } from "./__tests__/document-change-fixture";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";

describe("document change settlement", () => {
  it("includes multi-pass renderer-time silent corrections in one originating transaction", async () => {
    const renderer = createMockRenderer();
    const { engine, x, y, z } = await documentChangeFixture(renderer);
    const events = collectDocumentChanges(engine);
    let first = false;
    let second = false;
    renderer.syncBlock = vi.fn((id) => {
      if (id === x && !first) {
        first = true;
        engine.beginSilent();
        try {
          engine.block.setName(y, "correction one");
        } finally {
          engine.endSilent();
        }
      } else if (id === y && !second) {
        second = true;
        engine.beginSilent();
        try {
          engine.block.setName(z, "correction two");
        } finally {
          engine.endSilent();
        }
      }
    });
    engine.block.setName(x, "cause");
    expect(events).toHaveLength(1);
    expect(events[0].changedBlockIds).toEqual([x, y, z]);
    engine.undo();
    expect(events[1].origin).toBe("undo");
    expect(events[1].changedBlockIds).toEqual([x]);
  });

  it("delivers the persisted delta before a synchronous renderer error escapes", async () => {
    const renderer = createMockRenderer();
    const { engine, first, x } = await documentChangeFixture(renderer);
    const events = collectDocumentChanges(engine);
    renderer.syncBlock = vi.fn().mockImplementationOnce(() => {
      throw new Error("draw failed");
    });
    expect(() => engine.block.setName(x, "persisted")).toThrow("draw failed");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      transactionId: 1,
      origin: "edit",
      changedBlockIds: [x],
      affectedPageIds: [first],
    });
    engine.block.setName(x, "next");
    expect(events.map((event) => event.transactionId)).toEqual([1, 2]);
  });

  it("excludes navigation, selection, viewport, page view, previews, saving and history maintenance", async () => {
    const renderer = createMockRenderer();
    renderer.setPageView = vi.fn();
    const { engine, first, second, x } = await documentChangeFixture(renderer);
    const events = collectDocumentChanges(engine);
    engine.scene.setActivePage(first);
    engine.scene.setActivePage(second);
    engine.block.select(x);
    engine.block.deselectAll();
    engine.editor.setZoom(0.75);
    engine.editor.panTo(10, 20);
    engine.editor.setPageViewMode("active-page");
    engine.editor.setPageViewMode("all-pages");
    engine.editor.setEditMode("Crop", { blockId: first });
    engine.editor.setEditMode("Transform");
    engine.emit("block:transform", { block: x, phase: "drag" });
    engine.document.saveToString();
    engine.scene.saveToString();
    engine.clearHistory();
    engine.renderDirty();
    expect(events).toEqual([]);
    engine.block.setName(x, "committed");
    expect(events.map((event) => event.transactionId)).toEqual([1]);
  });

  it("does not strand the document event when history observers throw after renderer failure", async () => {
    const renderer = createMockRenderer();
    const { engine, x } = await documentChangeFixture(renderer);
    const events = collectDocumentChanges(engine);
    const observerError = new Error("history observer failed");
    const stop = engine.onHistoryChanged(() => {
      throw observerError;
    });
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    renderer.syncBlock = vi.fn().mockImplementationOnce(() => {
      throw new Error("original draw failure");
    });
    try {
      expect(() => engine.block.setName(x, "retained")).toThrow("original draw failure");
      expect(events).toHaveLength(1);
      expect(events[0].changedBlockIds).toEqual([x]);
      expect(report).toHaveBeenCalledWith(
        "[editx] Observer failed while draining a renderer error:",
        observerError,
      );
      stop();
      engine.block.setName(x, "next");
      expect(events.map((event) => event.transactionId)).toEqual([1, 2]);
    } finally {
      stop();
      report.mockRestore();
      engine.dispose();
    }
  });

  it("releases document listeners on engine disposal", async () => {
    const { engine, x } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    engine.dispose();
    engine.block.setName(x, "after disposal");
    expect(events).toEqual([]);
  });
});
