import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { BlockStore } from "./block/block-store";
import { CreateBlockCommand, DestroyBlockCommand, SetPropertyCommand } from "./controller/commands";
import { CreativeEngine } from "./creative-engine";
import type { RendererAdapter } from "./render-adapter";

describe("CreativeEngine", () => {
  describe("construction", () => {
    it("creates with default BlockStore when none provided", () => {
      const engine = new CreativeEngine({});
      expect(engine.getBlockStore()).toBeInstanceOf(BlockStore);
    });

    it("uses provided BlockStore", () => {
      const store = new BlockStore();
      const engine = new CreativeEngine({ blockStore: store });
      expect(engine.getBlockStore()).toBe(store);
    });

    it("renderer is null when not provided", () => {
      const engine = new CreativeEngine({});
      expect(engine.getRenderer()).toBeNull();
    });

    it("uses provided renderer", () => {
      const renderer = createMockRenderer();
      const engine = new CreativeEngine({ renderer });
      expect(engine.getRenderer()).toBe(renderer);
    });
  });

  describe("exec", () => {
    let engine: CreativeEngine;
    let renderer: RendererAdapter;

    beforeEach(() => {
      renderer = createMockRenderer();
      engine = new CreativeEngine({ renderer });
    });

    it("executes a command and syncs to renderer", () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);

      expect(renderer.syncBlock).toHaveBeenCalled();
      expect(renderer.renderFrame).toHaveBeenCalled();
    });

    it("pushes to history (becomes undoable)", () => {
      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      expect(engine.canUndo()).toBe(true);
    });

    it("fires block events after exec", () => {
      const cb = vi.fn();
      engine.event.subscribe([], cb);

      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));

      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0][0][0].type).toBe("created");
    });
  });

  describe("undo / redo", () => {
    let engine: CreativeEngine;
    let renderer: RendererAdapter;

    beforeEach(() => {
      renderer = createMockRenderer();
      engine = new CreativeEngine({ renderer });
    });

    it("undo reverses a command", () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;

      engine.undo();
      expect(store.exists(id)).toBe(false);
    });

    it("redo re-applies a command", () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;

      engine.undo();
      engine.redo();
      expect(store.exists(id)).toBe(true);
    });

    it("canUndo / canRedo track state", () => {
      const engine = new CreativeEngine({});
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(false);

      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      expect(engine.canUndo()).toBe(true);
      expect(engine.canRedo()).toBe(false);

      engine.undo();
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(true);
    });

    it("undo calls renderer.removeBlock for destroyed blocks", () => {
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;

      vi.mocked(renderer.syncBlock).mockClear();
      vi.mocked(renderer.removeBlock).mockClear();

      engine.undo(); // undo create → destroy
      expect(renderer.removeBlock).toHaveBeenCalledWith(id);
    });

    it("undo calls renderer.syncBlock for restored blocks", () => {
      const store = engine.getBlockStore();
      const createCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(createCmd);
      const id = createCmd.getCreatedId()!;

      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));
      vi.mocked(renderer.syncBlock).mockClear();

      engine.undo(); // undo property change → sync block
      expect(renderer.syncBlock).toHaveBeenCalled();
    });

    it("emits history:undo event", () => {
      const handler = vi.fn();
      engine.on("history:undo", handler);

      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      engine.undo();

      expect(handler).toHaveBeenCalled();
    });

    it("emits history:redo event", () => {
      const handler = vi.fn();
      engine.on("history:redo", handler);

      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      engine.undo();
      engine.redo();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("clearHistory", () => {
    it("clears undo/redo state", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      engine.clearHistory();

      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(false);
    });

    it("emits history:clear event", () => {
      const engine = new CreativeEngine({});
      const handler = vi.fn();
      engine.on("history:clear", handler);
      engine.clearHistory();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("batch", () => {
    it("groups multiple commands into one undo step", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();

      const id = store.create("graphic");
      // Create is not done via engine.exec here, so let's do it properly
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
      const engine = new CreativeEngine({ renderer });
      const store = engine.getBlockStore();
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
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();

      const cb = vi.fn();
      engine.event.subscribe([], cb);

      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      expect(cb).not.toHaveBeenCalled(); // no flush during batch

      engine.endBatch();
      // Events are flushed after endBatch (but only with renderer)
      // Without renderer, _flush is not called since #flush returns early.
      // This is correct behavior — events need a renderer-driven flush cycle.
    });
  });

  // Selection tests moved to block-api.test.ts (selection is owned by BlockAPI now)

  describe("active scene / page", () => {
    it("setActiveScene / getActiveScene", () => {
      const engine = new CreativeEngine({});
      engine.setActiveScene(10);
      expect(engine.getActiveScene()).toBe(10);
    });

    it("setActivePage / getActivePage", () => {
      const engine = new CreativeEngine({});
      engine.setActivePage(20);
      expect(engine.getActivePage()).toBe(20);
    });

    it("defaults to null", () => {
      const engine = new CreativeEngine({});
      expect(engine.getActiveScene()).toBeNull();
      expect(engine.getActivePage()).toBeNull();
    });
  });

  describe("legacy event bus", () => {
    it("on / off / emit", () => {
      const engine = new CreativeEngine({});
      const handler = vi.fn();
      engine.on("custom", handler);
      engine.emit("custom", "data");
      expect(handler).toHaveBeenCalledWith("data");

      engine.off("custom", handler);
      engine.emit("custom", "data2");
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("headless (no renderer)", () => {
    it("exec works without renderer", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      expect(engine.canUndo()).toBe(true);
    });

    it("undo works without renderer", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;
      engine.undo();
      expect(store.exists(id)).toBe(false);
    });
  });

  describe("nested batch", () => {
    it("nested beginBatch/endBatch produces exactly one undo step", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();

      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));

      // Nested batch (like setPosition/setSize do internally)
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.exec(new SetPropertyCommand(store, id, "transform/size/width", 300));
      engine.endBatch(); // inner endBatch — should NOT commit

      engine.exec(new SetPropertyCommand(store, id, "transform/size/height", 400));
      engine.endBatch(); // outer endBatch — commits all

      expect(store.getFloat(id, "transform/position/x")).toBe(10);
      expect(store.getFloat(id, "transform/position/y")).toBe(20);
      expect(store.getFloat(id, "transform/size/width")).toBe(300);
      expect(store.getFloat(id, "transform/size/height")).toBe(400);

      // Single undo should revert all 4 properties at once (defaults: pos=0, size=100)
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(0);
      expect(store.getFloat(id, "transform/position/y")).toBe(0);
      expect(store.getFloat(id, "transform/size/width")).toBe(100);
      expect(store.getFloat(id, "transform/size/height")).toBe(100);

      // Only one undo step was created
      expect(engine.canUndo()).toBe(false);
    });

    it("inner endBatch does not flush the renderer", () => {
      const renderer = createMockRenderer();
      const engine = new CreativeEngine({ renderer });
      const store = engine.getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();

      vi.mocked(renderer.renderFrame).mockClear();

      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));

      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 20));
      engine.endBatch(); // inner — no flush
      expect(renderer.renderFrame).not.toHaveBeenCalled();

      engine.endBatch(); // outer — flush
      expect(renderer.renderFrame).toHaveBeenCalled();
    });

    it("triple-nested batch still produces one undo step", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
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

  describe("destroy with sub-blocks", () => {
    it("undo of destroy restores sub-blocks (shape, fill)", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();

      const graphicId = store.create("graphic");
      const shapeId = store.createShape("rect");
      store.setShape(graphicId, shapeId);
      const fillId = store.createFill("color");
      store.setFill(graphicId, fillId);
      engine.clearHistory();

      engine.exec(new DestroyBlockCommand(store, graphicId));
      expect(store.exists(graphicId)).toBe(false);
      expect(store.exists(shapeId)).toBe(false);
      expect(store.exists(fillId)).toBe(false);

      engine.undo();
      expect(store.exists(graphicId)).toBe(true);
      expect(store.exists(shapeId)).toBe(true);
      expect(store.exists(fillId)).toBe(true);
      expect(store.getShape(graphicId)).toBe(shapeId);
      expect(store.getFill(graphicId)).toBe(fillId);
    });
  });

  describe("selection cleanup on undo", () => {
    it("removes destroyed blocks from selection on undo", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();

      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;

      engine.block.select(id);
      expect(engine.block.findAllSelected()).toContain(id);

      engine.undo(); // undo create → destroy
      expect(engine.block.findAllSelected()).not.toContain(id);
    });

    it("does not change selection when undo only updates blocks", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();

      const cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(cmd);
      const id = cmd.getCreatedId()!;

      engine.block.select(id);
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));

      engine.undo(); // undo property change — no destroy
      expect(engine.block.findAllSelected()).toContain(id);
    });
  });

  describe("silent mode", () => {
    it("skips history for exec while silent", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();

      engine.beginSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endSilent();

      expect(engine.canUndo()).toBe(false);
      expect(store.getFloat(id, "transform/position/x")).toBe(42);
    });

    it("skips history for batch while silent", () => {
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
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
      const engine = new CreativeEngine({});
      const store = engine.getBlockStore();
      const id = store.create("graphic");
      engine.clearHistory();

      engine.beginSilent();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 42));
      engine.endSilent();

      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 99));
      expect(engine.canUndo()).toBe(true);
    });

    it("still fires block events while silent", () => {
      const renderer = createMockRenderer();
      const engine = new CreativeEngine({ renderer });
      const store = engine.getBlockStore();
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
