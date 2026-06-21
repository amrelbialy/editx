import { beforeEach, describe, expect, it } from "vitest";
import { AppendChildCommand } from "../../controller/commands/append-child-command";
import { AppendEffectCommand } from "../../controller/commands/append-effect-command";
import { CreateBlockCommand } from "../../controller/commands/create-block-command";
import { CreateEffectCommand } from "../../controller/commands/create-effect-command";
import { CreateFillCommand } from "../../controller/commands/create-fill-command";
import { CreateShapeCommand } from "../../controller/commands/create-shape-command";
import { DestroyBlockCommand } from "../../controller/commands/destroy-block-command";
import { SetFillCommand } from "../../controller/commands/set-fill-command";
import { SetShapeCommand } from "../../controller/commands/set-shape-command";
import { EditxEngine } from "../../editx-engine";
import { createMockRenderer } from "../mocks/mock-renderer";

describe("Engine Integration: Sub-block & reparent lifecycle", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  /** Exec a create-style command and return the created block id. */
  const exec = (
    command: CreateBlockCommand | CreateShapeCommand | CreateFillCommand | CreateEffectCommand,
  ): number => {
    engine.exec(command);
    const id = command.getCreatedId();
    if (id == null) throw new Error("command did not create a block");
    return id;
  };

  describe("reparenting a child between two parents", () => {
    it("undo restores the child to its original parent", () => {
      const store = engine.getBlockStore();

      const pageA = exec(new CreateBlockCommand(store, "page"));
      const pageB = exec(new CreateBlockCommand(store, "page"));
      const child = exec(new CreateBlockCommand(store, "graphic"));

      // Initial parent: pageA
      engine.exec(new AppendChildCommand(store, pageA, child));
      expect(store.getChildren(pageA)).toEqual([child]);
      expect(store.getParent(child)).toBe(pageA);

      // Reparent to pageB
      engine.exec(new AppendChildCommand(store, pageB, child));
      expect(store.getChildren(pageB)).toEqual([child]);
      expect(store.getChildren(pageA)).toEqual([]);
      expect(store.getParent(child)).toBe(pageB);

      // Undo reparent → child must return to pageA
      engine.undo();
      expect(store.getParent(child)).toBe(pageA);
      expect(store.getChildren(pageA)).toEqual([child]);
      expect(store.getChildren(pageB)).toEqual([]);
    });

    it("redo re-applies the reparent", () => {
      const store = engine.getBlockStore();

      const pageA = exec(new CreateBlockCommand(store, "page"));
      const pageB = exec(new CreateBlockCommand(store, "page"));
      const child = exec(new CreateBlockCommand(store, "graphic"));

      engine.exec(new AppendChildCommand(store, pageA, child));
      engine.exec(new AppendChildCommand(store, pageB, child));

      engine.undo();
      engine.redo();

      expect(store.getParent(child)).toBe(pageB);
      expect(store.getChildren(pageB)).toEqual([child]);
      expect(store.getChildren(pageA)).toEqual([]);
    });
  });

  describe("graphic with shape + fill destroy/undo", () => {
    it("undo restores the graphic and its shape/fill references", () => {
      const store = engine.getBlockStore();

      const graphic = exec(new CreateBlockCommand(store, "graphic"));
      const shape = exec(new CreateShapeCommand(store, "rect"));
      const fill = exec(new CreateFillCommand(store, "color"));
      engine.exec(new SetShapeCommand(store, graphic, shape));
      engine.exec(new SetFillCommand(store, graphic, fill));

      expect(store.getShape(graphic)).toBe(shape);
      expect(store.getFill(graphic)).toBe(fill);

      // Destroy the graphic — cascades to shape + fill
      engine.exec(new DestroyBlockCommand(store, graphic));
      expect(store.exists(graphic)).toBe(false);
      expect(store.exists(shape)).toBe(false);
      expect(store.exists(fill)).toBe(false);

      // Undo → graphic and sub-blocks restored with intact references
      engine.undo();
      expect(store.exists(graphic)).toBe(true);
      expect(store.exists(shape)).toBe(true);
      expect(store.exists(fill)).toBe(true);
      expect(store.getShape(graphic)).toBe(shape);
      expect(store.getFill(graphic)).toBe(fill);
    });
  });

  describe("effect lifecycle on a block", () => {
    it("create → append → destroy effect → undo restores the owner reference", () => {
      const store = engine.getBlockStore();

      const graphic = exec(new CreateBlockCommand(store, "graphic"));
      const effect = exec(new CreateEffectCommand(store, "filter"));
      engine.exec(new AppendEffectCommand(store, graphic, effect));
      expect(store.getEffects(graphic)).toEqual([effect]);

      // Destroy the effect → owner reference cleared
      engine.exec(new DestroyBlockCommand(store, effect));
      expect(store.exists(effect)).toBe(false);
      expect(store.getEffects(graphic)).toEqual([]);

      // Undo → effect restored AND re-linked to owner
      engine.undo();
      expect(store.exists(effect)).toBe(true);
      expect(store.getEffects(graphic)).toEqual([effect]);
    });
  });

  describe("batch edge cases", () => {
    it("nested begin/end batch groups everything into a single undo step", () => {
      const store = engine.getBlockStore();

      engine.beginBatch();
      const a = exec(new CreateBlockCommand(store, "graphic"));
      engine.beginBatch();
      const b = exec(new CreateBlockCommand(store, "graphic"));
      engine.endBatch();
      engine.endBatch();

      expect(store.exists(a)).toBe(true);
      expect(store.exists(b)).toBe(true);

      engine.undo();
      expect(store.exists(a)).toBe(false);
      expect(store.exists(b)).toBe(false);
    });

    it("an empty batch does not create an undo step", () => {
      engine.beginBatch();
      engine.endBatch();
      expect(engine.canUndo()).toBe(false);
    });
  });
});
