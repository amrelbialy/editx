import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockStore } from "../../block/block-store";
import { AppendChildCommand } from "../../controller/commands/append-child-command";
import { CreateBlockCommand } from "../../controller/commands/create-block-command";
import { DestroyBlockCommand } from "../../controller/commands/destroy-block-command";
import { SetPropertyCommand } from "../../controller/commands/set-property-command";
import { EditxEngine } from "../../editx-engine";
import { createMockRenderer } from "../mocks/mock-renderer";

describe("Engine Integration: Command Chains", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  describe("create â†’ set properties â†’ undo â†’ redo â†’ destroy â†’ undo", () => {
    it("full lifecycle with correct state at each step", () => {
      const store = engine.getBlockStore();

      // 1. Create block
      const createCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(createCmd);
      const id = createCmd.getCreatedId()!;
      expect(store.exists(id)).toBe(true);
      expect(store.get(id)!.type).toBe("graphic");

      // 2. Set properties
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 100));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 200));
      expect(store.getFloat(id, "transform/position/x")).toBe(100);
      expect(store.getFloat(id, "transform/position/y")).toBe(200);

      // 3. Undo position/y â†’ reverts to 0
      engine.undo();
      expect(store.getFloat(id, "transform/position/y")).toBe(0);
      expect(store.getFloat(id, "transform/position/x")).toBe(100);

      // 4. Redo position/y â†’ back to 200
      engine.redo();
      expect(store.getFloat(id, "transform/position/y")).toBe(200);

      // 5. Destroy block
      engine.exec(new DestroyBlockCommand(store, id));
      expect(store.exists(id)).toBe(false);

      // 6. Undo destroy â†’ block restored
      engine.undo();
      expect(store.exists(id)).toBe(true);
      expect(store.getFloat(id, "transform/position/x")).toBe(100);
      expect(store.getFloat(id, "transform/position/y")).toBe(200);
    });
  });

  describe("batch operations", () => {
    it("groups multiple commands into a single undo step", () => {
      const store = engine.getBlockStore();

      const createCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(createCmd);
      const id = createCmd.getCreatedId()!;
      engine.clearHistory();

      // Batch: set x, y, and size in one undo step
      engine.beginBatch();
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/y", 75));
      engine.exec(new SetPropertyCommand(store, id, "transform/size/width", 300));
      engine.endBatch();

      expect(store.getFloat(id, "transform/position/x")).toBe(50);
      expect(store.getFloat(id, "transform/position/y")).toBe(75);
      expect(store.getFloat(id, "transform/size/width")).toBe(300);

      // Single undo should revert all three
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(0);
      expect(store.getFloat(id, "transform/position/y")).toBe(0);
      // Default size for graphic blocks is 100
      expect(store.getFloat(id, "transform/size/width")).toBe(100);
    });
  });

  describe("parent-child hierarchy", () => {
    it("creates page with children and undoes correctly", () => {
      const store = engine.getBlockStore();

      const pageCmd = new CreateBlockCommand(store, "page");
      engine.exec(pageCmd);
      const pageId = pageCmd.getCreatedId()!;

      const child1Cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(child1Cmd);
      const child1 = child1Cmd.getCreatedId()!;

      const child2Cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(child2Cmd);
      const child2 = child2Cmd.getCreatedId()!;

      engine.exec(new AppendChildCommand(store, pageId, child1));
      engine.exec(new AppendChildCommand(store, pageId, child2));

      expect(store.getChildren(pageId)).toEqual([child1, child2]);

      // Undo removing child2
      engine.undo();
      expect(store.getChildren(pageId)).toEqual([child1]);

      // Undo removing child1
      engine.undo();
      expect(store.getChildren(pageId)).toEqual([]);

      // Redo both
      engine.redo();
      engine.redo();
      expect(store.getChildren(pageId)).toEqual([child1, child2]);
    });
  });

  describe("destroy cascades to children", () => {
    it("destroying parent removes children and undo restores all", () => {
      const store = engine.getBlockStore();

      const pageCmd = new CreateBlockCommand(store, "page");
      engine.exec(pageCmd);
      const pageId = pageCmd.getCreatedId()!;

      const childCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(childCmd);
      const childId = childCmd.getCreatedId()!;

      engine.exec(new AppendChildCommand(store, pageId, childId));
      engine.exec(new SetPropertyCommand(store, childId, "transform/position/x", 42));

      expect(store.exists(childId)).toBe(true);
      expect(store.getFloat(childId, "transform/position/x")).toBe(42);

      // Destroy page (cascades to child)
      engine.exec(new DestroyBlockCommand(store, pageId));
      expect(store.exists(pageId)).toBe(false);
      expect(store.exists(childId)).toBe(false);

      // Undo â†’ both restored
      engine.undo();
      expect(store.exists(pageId)).toBe(true);
      expect(store.exists(childId)).toBe(true);
      expect(store.getFloat(childId, "transform/position/x")).toBe(42);
    });
  });

  describe("multiple undo-redo cycles", () => {
    it("handles 5 actions â†’ undo 3 â†’ redo 1 correctly", () => {
      const store = engine.getBlockStore();

      const createCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(createCmd);
      const id = createCmd.getCreatedId()!;
      engine.clearHistory();

      // 5 property changes
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 10));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 20));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 30));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 40));
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 50));
      expect(store.getFloat(id, "transform/position/x")).toBe(50);

      // Undo 3 â†’ x should be 20
      engine.undo();
      engine.undo();
      engine.undo();
      expect(store.getFloat(id, "transform/position/x")).toBe(20);

      // Redo 1 â†’ x should be 30
      engine.redo();
      expect(store.getFloat(id, "transform/position/x")).toBe(30);

      // New action after partial undo â†’ clears redo stack
      engine.exec(new SetPropertyCommand(store, id, "transform/position/x", 99));
      expect(store.getFloat(id, "transform/position/x")).toBe(99);
      expect(engine.canRedo()).toBe(false);
    });
  });

  describe("destroy child restores parent references", () => {
    it("undoing destroy of a child restores parent's children array", () => {
      const store = engine.getBlockStore();

      const pageCmd = new CreateBlockCommand(store, "page");
      engine.exec(pageCmd);
      const pageId = pageCmd.getCreatedId()!;

      const child1Cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(child1Cmd);
      const child1 = child1Cmd.getCreatedId()!;

      const child2Cmd = new CreateBlockCommand(store, "graphic");
      engine.exec(child2Cmd);
      const child2 = child2Cmd.getCreatedId()!;

      engine.exec(new AppendChildCommand(store, pageId, child1));
      engine.exec(new AppendChildCommand(store, pageId, child2));
      expect(store.getChildren(pageId)).toEqual([child1, child2]);

      // Destroy just child1 (not the page)
      engine.exec(new DestroyBlockCommand(store, child1));
      expect(store.exists(child1)).toBe(false);
      expect(store.getChildren(pageId)).toEqual([child2]);

      // Undo â†’ child1 restored AND parent's children array restored
      engine.undo();
      expect(store.exists(child1)).toBe(true);
      expect(store.getChildren(pageId)).toEqual([child1, child2]);
      expect(store.getParent(child1)).toBe(pageId);

      // Redo â†’ child1 destroyed again, parent updated
      engine.redo();
      expect(store.exists(child1)).toBe(false);
      expect(store.getChildren(pageId)).toEqual([child2]);
    });

    it("undoing destroy of an effect restores owner's effectIds", () => {
      const store = engine.getBlockStore();

      const blockCmd = new CreateBlockCommand(store, "graphic");
      engine.exec(blockCmd);
      const blockId = blockCmd.getCreatedId()!;

      const effectId = store.createEffect("filter");
      store.appendEffect(blockId, effectId);
      engine.clearHistory();

      expect(store.getEffects(blockId)).toEqual([effectId]);

      // Destroy the effect
      engine.exec(new DestroyBlockCommand(store, effectId));
      expect(store.exists(effectId)).toBe(false);
      expect(store.getEffects(blockId)).toEqual([]);

      // Undo â†’ effect restored AND owner's effectIds restored
      engine.undo();
      expect(store.exists(effectId)).toBe(true);
      expect(store.getEffects(blockId)).toEqual([effectId]);
    });
  });
});
