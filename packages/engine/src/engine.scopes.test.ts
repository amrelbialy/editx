import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { SetPropertyCommand } from "./controller/commands";
import { EditxEngine } from "./editx-engine";

describe("EditxEngine command scopes", () => {
  describe("batch", () => {
    it("groups multiple commands into one undo step", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.endBatch();
      expect(store.getFloat(id, "transform/position/x")).toBe(10);
      expect(store.getFloat(id, "transform/position/y")).toBe(20);
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(0);
      expect(store.getFloat(id, "transform/position/y")).toBe(0);
    });

    it("does not flush renderer during batch", () => {
      const renderer = createMockRenderer();
      const engine = new EditxEngine({ renderer });
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      vi.mocked(renderer.renderFrame).mockClear();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      expect(renderer.renderFrame).not.toHaveBeenCalled();
      engine.endBatch();
      expect(renderer.renderFrame).toHaveBeenCalled();
    });

    it("fires block events after endBatch", () => {
      const engine = new EditxEngine({ renderer: createMockRenderer() });
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      const cb = vi.fn();
      engine.event.subscribe([], cb);
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      expect(cb).not.toHaveBeenCalled();
      engine.endBatch();
      expect(cb).toHaveBeenCalledExactlyOnceWith([{ block: id, type: "updated" }]);
    });
  });

  describe("nested batch", () => {
    it("nested beginBatch/endBatch produces exactly one undo step", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.exec(new SetPropertyCommand(store, id, "transform/size/width", 300));
      engine.endBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/size/height", 400));
      engine.endBatch();
      expect(store.getFloat(id, "transform/position/x")).toBe(10);
      expect(store.getFloat(id, "transform/position/y")).toBe(20);
      expect(store.getFloat(id, "transform/size/width")).toBe(300);
      expect(store.getFloat(id, "transform/size/height")).toBe(400);
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(0);
      expect(store.getFloat(id, "transform/position/y")).toBe(0);
      expect(store.getFloat(id, "transform/size/width")).toBe(100);
      expect(store.getFloat(id, "transform/size/height")).toBe(100);
      expect(engine.canUndo()).toBe(false);
    });

    it("inner endBatch does not flush the renderer", () => {
      const renderer = createMockRenderer();
      const engine = new EditxEngine({ renderer });
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      vi.mocked(renderer.renderFrame).mockClear();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.endBatch();
      expect(renderer.renderFrame).not.toHaveBeenCalled();
      engine.endBatch();
      expect(renderer.renderFrame).toHaveBeenCalled();
    });

    it("triple-nested batch still produces one undo step", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginBatch();
      engine.beginBatch();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endBatch();
      engine.endBatch();
      engine.endBatch();
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(0);
      expect(engine.canUndo()).toBe(false);
    });
  });

  describe("silent mode", () => {
    it("skips history for exec while silent", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endSilent();
      expect(engine.canUndo()).toBe(false);
      expect(store.getFloat(id, "transform/position/x")).toBe(42);
    });

    it("skips history for batch while silent", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginSilent();
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.endBatch();
      engine.endSilent();
      expect(engine.canUndo()).toBe(false);
      expect(store.getFloat(id, "transform/position/x")).toBe(10);
      expect(store.getFloat(id, "transform/position/y")).toBe(20);
    });

    it("records history again after endSilent", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      engine.beginSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 100));
      expect(engine.canUndo()).toBe(true);
    });

    it("still fires block events while silent", () => {
      const engine = new EditxEngine({ renderer: createMockRenderer() });
      const store = engine._getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();
      const cb = vi.fn();
      engine.event.subscribe([], cb);
      engine.beginSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endSilent();
      expect(cb).toHaveBeenCalled();
    });
  });
});
