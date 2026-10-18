import { describe, expect, it, vi } from "vitest";
import { CreateBlockCommand, DestroyBlockCommand, SetPropertyCommand } from "./controller/commands";
import { EditxEngine } from "./editx-engine";

describe("EditxEngine state", () => {
  describe("active scene / page", () => {
    it("setActiveScene / getActiveScene", () => {
      const engine = new EditxEngine({});
      const scene = engine.block.create("scene");
      engine.setActiveScene(scene);
      expect(engine.getActiveScene()).toBe(scene);
    });

    it("setActivePage / getActivePage", async () => {
      const engine = new EditxEngine({});
      await engine.scene.create();
      const first = engine.getActivePage()!;
      engine.scene.addPage();
      engine.setActivePage(first);
      expect(engine.getActivePage()).toBe(first);
    });

    it("defaults to null", () => {
      const engine = new EditxEngine({});
      expect(engine.getActiveScene()).toBeNull();
      expect(engine.getActivePage()).toBeNull();
    });
  });

  describe("legacy event bus", () => {
    it("on / off / emit", () => {
      const engine = new EditxEngine({});
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
      const engine = new EditxEngine({});
      engine.exec(new CreateBlockCommand(engine._getBlockStore(), "graphic"));
      expect(engine.canUndo()).toBe(true);
    });

    it("undo works without renderer", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      engine.undo();
      expect(store.exists(command.getCreatedId()!)).toBe(false);
    });
  });

  describe("destroy with sub-blocks", () => {
    it("undo of destroy restores sub-blocks (shape, fill)", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const graphic = store.create("graphic");
      const shape = store.createShape("rect");
      store.setShape(graphic, shape);
      const fill = store.createFill("color");
      store.setFill(graphic, fill);
      engine.clearHistory();
      engine.exec(new DestroyBlockCommand(store, graphic));
      expect(store.exists(graphic)).toBe(false);
      expect(store.exists(shape)).toBe(false);
      expect(store.exists(fill)).toBe(false);
      engine.undo();
      expect(store.exists(graphic)).toBe(true);
      expect(store.exists(shape)).toBe(true);
      expect(store.exists(fill)).toBe(true);
      expect(store.getShape(graphic)).toBe(shape);
      expect(store.getFill(graphic)).toBe(fill);
    });
  });

  describe("selection cleanup on undo", () => {
    it("removes destroyed blocks from selection on undo", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      const id = command.getCreatedId()!;
      engine.block.select(id);
      expect(engine.block.findAllSelected()).toContain(id);
      engine.undo();
      expect(engine.block.findAllSelected()).not.toContain(id);
    });

    it("does not change selection when undo only updates blocks", () => {
      const engine = new EditxEngine({});
      const store = engine._getBlockStore();
      const command = new CreateBlockCommand(store, "graphic");
      engine.exec(command);
      const id = command.getCreatedId()!;
      engine.block.select(id);
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));
      engine.undo();
      expect(engine.block.findAllSelected()).toContain(id);
    });
  });
});
