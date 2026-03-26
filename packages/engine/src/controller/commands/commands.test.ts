import { beforeEach, describe, expect, it } from "vitest";
import { BlockStore } from "../../block/block-store";
import { AppendChildCommand } from "./append-child-command";
import { CreateBlockCommand } from "./create-block-command";
import { DestroyBlockCommand } from "./destroy-block-command";
import { RemoveChildCommand } from "./remove-child-command";
import { SetKindCommand } from "./set-kind-command";
import { SetPropertyCommand } from "./set-property-command";

describe("Commands", () => {
  let store: BlockStore;

  beforeEach(() => {
    store = new BlockStore();
  });

  describe("CreateBlockCommand", () => {
    it("creates a block and returns a patch with before=null", () => {
      const cmd = new CreateBlockCommand(store, "graphic");
      const patches = cmd.do();

      expect(patches).toHaveLength(1);
      expect(patches[0].before).toBeNull();
      expect(patches[0].after).not.toBeNull();
      expect(patches[0].after!.type).toBe("graphic");
    });

    it("getCreatedId returns the block id", () => {
      const cmd = new CreateBlockCommand(store, "text");
      cmd.do();
      const id = cmd.getCreatedId();
      expect(id).not.toBeNull();
      expect(store.exists(id!)).toBe(true);
    });

    it("getCreatedId returns null before do() is called", () => {
      const cmd = new CreateBlockCommand(store, "graphic");
      expect(cmd.getCreatedId()).toBeNull();
    });

    it("creates block with kind", () => {
      const cmd = new CreateBlockCommand(store, "graphic", "circle");
      cmd.do();
      const id = cmd.getCreatedId()!;
      expect(store.getKind(id)).toBe("circle");
    });

    it("patch id matches the created block id", () => {
      const cmd = new CreateBlockCommand(store, "graphic");
      const patches = cmd.do();
      expect(patches[0].id).toBe(cmd.getCreatedId());
    });
  });

  describe("DestroyBlockCommand", () => {
    it("destroys a block and returns a patch with after=null", () => {
      const id = store.create("graphic");
      const cmd = new DestroyBlockCommand(store, id);
      const patches = cmd.do();

      expect(patches).toHaveLength(1);
      expect(patches[0].before).not.toBeNull();
      expect(patches[0].before!.type).toBe("graphic");
      expect(patches[0].after).toBeNull();
      expect(store.exists(id)).toBe(false);
    });

    it("patch id matches the destroyed block id", () => {
      const id = store.create("text");
      const cmd = new DestroyBlockCommand(store, id);
      const patches = cmd.do();
      expect(patches[0].id).toBe(id);
    });
  });

  describe("SetPropertyCommand", () => {
    it("sets a property and returns before/after snapshots", () => {
      const id = store.create("graphic");
      const cmd = new SetPropertyCommand(store, id, "transform/position/x", 50);
      const patches = cmd.do();

      expect(patches).toHaveLength(1);
      expect(patches[0].before).not.toBeNull();
      expect(patches[0].after).not.toBeNull();
      expect(patches[0].before!.properties["transform/position/x"]).toBe(0);
      expect(patches[0].after!.properties["transform/position/x"]).toBe(50);
    });

    it("patch id matches block id", () => {
      const id = store.create("graphic");
      const cmd = new SetPropertyCommand(store, id, "transform/position/x", 50);
      const patches = cmd.do();
      expect(patches[0].id).toBe(id);
    });
  });

  describe("SetKindCommand", () => {
    it("sets kind and returns before/after snapshots", () => {
      const id = store.create("graphic");
      const cmd = new SetKindCommand(store, id, "ellipse");
      const patches = cmd.do();

      expect(patches).toHaveLength(1);
      expect(patches[0].before!.kind).toBe("");
      expect(patches[0].after!.kind).toBe("ellipse");
    });
  });

  describe("AppendChildCommand", () => {
    it("appends child and returns 2 patches (parent + child)", () => {
      const parent = store.create("page");
      const child = store.create("graphic");
      const cmd = new AppendChildCommand(store, parent, child);
      const patches = cmd.do();

      expect(patches).toHaveLength(2);
      expect(patches[0].id).toBe(parent);
      expect(patches[1].id).toBe(child);

      // Parent after should have child in children
      expect(patches[0].after!.children).toContain(child);
      // Child after should have parentId set
      expect(patches[1].after!.parentId).toBe(parent);
    });

    it("before snapshots have no parent-child relationship", () => {
      const parent = store.create("page");
      const child = store.create("graphic");
      const cmd = new AppendChildCommand(store, parent, child);
      const patches = cmd.do();

      expect(patches[0].before!.children).not.toContain(child);
      expect(patches[1].before!.parentId).toBeNull();
    });
  });

  describe("RemoveChildCommand", () => {
    it("removes child and returns 2 patches", () => {
      const parent = store.create("page");
      const child = store.create("graphic");
      store.appendChild(parent, child);

      const cmd = new RemoveChildCommand(store, parent, child);
      const patches = cmd.do();

      expect(patches).toHaveLength(2);
      expect(patches[0].id).toBe(parent);
      expect(patches[1].id).toBe(child);

      // Before should have the relationship
      expect(patches[0].before!.children).toContain(child);
      expect(patches[1].before!.parentId).toBe(parent);

      // After should not
      expect(patches[0].after!.children).not.toContain(child);
      expect(patches[1].after!.parentId).toBeNull();
    });
  });
});
