import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { BlockStore } from "./block/block-store";
import { CreateBlockCommand, SetPropertyCommand } from "./controller/commands";
import { EditxEngine } from "./editx-engine";
import type { RendererAdapter } from "./render-adapter";

describe("EditxEngine", () => {
  describe("construction", () => {
    it("creates with default BlockStore when none provided", () => {
      const engine = new EditxEngine({});
      expect(engine._getBlockStore()).toBeInstanceOf(BlockStore);
    });

    it("uses provided BlockStore", () => {
      const store = new BlockStore();
      const engine = new EditxEngine({ blockStore: store });
      expect(engine._getBlockStore()).toBe(store);
    });

    it("renderer is null when not provided", () => {
      const engine = new EditxEngine({});
      expect(engine.getRenderer()).toBeNull();
    });

    it("uses provided renderer", () => {
      const renderer = createMockRenderer();
      const engine = new EditxEngine({ renderer });
      expect(engine.getRenderer()).toBe(renderer);
    });
  });

  describe("exec", () => {
    let engine: EditxEngine;
    let renderer: RendererAdapter;

    beforeEach(() => {
      renderer = createMockRenderer();
      engine = new EditxEngine({ renderer });
    });

    it("executes a command and syncs to renderer", () => {
      const store = engine._getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      expect(renderer.syncBlock).toHaveBeenCalled();
      expect(renderer.renderFrame).toHaveBeenCalled();
    });

    it("pushes to history (becomes undoable)", () => {
      const store = engine._getBlockStore();
      engine.exec(new CreateBlockCommand(store, "graphic"));
      expect(engine.canUndo()).toBe(true);
    });

    it("fires block events after exec", () => {
      const cb = vi.fn();
      engine.event.subscribe([], cb);
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0][0][0].type).toBe("created");
    });
  });

  describe("undo / redo", () => {
    let engine: EditxEngine;
    let renderer: RendererAdapter;

    beforeEach(() => {
      renderer = createMockRenderer();
      engine = new EditxEngine({ renderer });
    });

    it("undo reverses a command", () => {
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      engine.undo();
      expect(store.exists(command.getCreatedId()!)).toBe(false);
    });

    it("redo re-applies a command", () => {
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      engine.undo();
      engine.redo();
      expect(store.exists(command.getCreatedId()!)).toBe(true);
    });

    it("canUndo / canRedo track state", () => {
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(false);
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      expect(engine.canUndo()).toBe(true);
      expect(engine.canRedo()).toBe(false);
      engine.undo();
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(true);
    });

    it("undo calls renderer.removeBlock for destroyed blocks", () => {
      const command = new CreateBlockCommand(engine._getBlockStore(), "graphic");
      engine.exec(command);
      vi.mocked(renderer.syncBlock).mockClear();
      vi.mocked(renderer.removeBlock).mockClear();
      engine.undo();
      expect(renderer.removeBlock).toHaveBeenCalledWith(command.getCreatedId());
    });

    it("undo calls renderer.syncBlock for restored blocks", () => {
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      engine.exec(
        new SetPropertyCommand(store, command.getCreatedId()!, "transform/position/x", 50),
      );
      vi.mocked(renderer.syncBlock).mockClear();
      engine.undo();
      expect(renderer.syncBlock).toHaveBeenCalled();
    });

    it("emits history:undo event", () => {
      const handler = vi.fn();
      engine.on("history:undo", handler);
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      engine.undo();
      expect(handler).toHaveBeenCalled();
    });

    it("emits history:redo event", () => {
      const handler = vi.fn();
      engine.on("history:redo", handler);
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      engine.undo();
      engine.redo();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("clearHistory", () => {
    it("clears undo/redo state", () => {
      const engine = new EditxEngine({});
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      engine.clearHistory();
      expect(engine.canUndo()).toBe(false);
      expect(engine.canRedo()).toBe(false);
    });

    it("emits history:clear event", () => {
      const engine = new EditxEngine({});
      const handler = vi.fn();
      engine.on("history:clear", handler);
      engine.clearHistory();
      expect(handler).toHaveBeenCalled();
    });
  });
});
