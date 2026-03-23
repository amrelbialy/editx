import { beforeEach, describe, expect, it } from "vitest";
import { BlockStore } from "./block-store";
import { FILL_COLOR, IMAGE_SRC, OPACITY, POSITION_X, SIZE_WIDTH, VISIBLE } from "./property-keys";

describe("BlockStore", () => {
  let store: BlockStore;

  beforeEach(() => {
    store = new BlockStore();
  });

  // --- CRUD ---

  describe("create", () => {
    it("returns auto-incrementing IDs", () => {
      const id1 = store.create("graphic");
      const id2 = store.create("graphic");
      expect(id2).toBe(id1 + 1);
    });

    it("block exists after creation", () => {
      const id = store.create("graphic");
      expect(store.exists(id)).toBe(true);
    });

    it("assigns correct type", () => {
      const id = store.create("text");
      expect(store.getType(id)).toBe("text");
    });

    it("assigns default name based on type and id", () => {
      const id = store.create("image");
      expect(store.getName(id)).toBe(`image-${id}`);
    });

    it("assigns kind from parameter", () => {
      const id = store.create("graphic", "circle");
      expect(store.getKind(id)).toBe("circle");
    });

    it("assigns default properties for the type", () => {
      const id = store.create("graphic");
      expect(store.getFloat(id, POSITION_X)).toBe(0);
      expect(store.getFloat(id, SIZE_WIDTH)).toBe(100);
      expect(store.getFloat(id, OPACITY)).toBe(1);
      expect(store.getBool(id, VISIBLE)).toBe(true);
    });
  });

  describe("get / exists", () => {
    it("get returns block data", () => {
      const id = store.create("graphic");
      const block = store.get(id);
      expect(block).toBeDefined();
      expect(block!.type).toBe("graphic");
    });

    it("get returns undefined for missing block", () => {
      expect(store.get(999)).toBeUndefined();
    });

    it("exists returns false for missing block", () => {
      expect(store.exists(999)).toBe(false);
    });
  });

  describe("destroy", () => {
    it("removes the block", () => {
      const id = store.create("graphic");
      store.destroy(id);
      expect(store.exists(id)).toBe(false);
    });

    it("unparents the block", () => {
      const parent = store.create("page");
      const child = store.create("graphic");
      store.appendChild(parent, child);
      store.destroy(child);
      expect(store.getChildren(parent)).toEqual([]);
    });

    it("recursively destroys children", () => {
      const parent = store.create("page");
      const child = store.create("graphic");
      store.appendChild(parent, child);
      store.destroy(parent);
      expect(store.exists(child)).toBe(false);
    });

    it("does nothing for non-existent block", () => {
      // Should not throw
      store.destroy(999);
    });
  });

  // --- Kind / Name ---

  describe("getKind / setKind", () => {
    it("sets and gets kind", () => {
      const id = store.create("graphic");
      store.setKind(id, "rectangle");
      expect(store.getKind(id)).toBe("rectangle");
    });

    it("returns empty string for missing block", () => {
      expect(store.getKind(999)).toBe("");
    });
  });

  describe("getName / setName", () => {
    it("sets and gets name", () => {
      const id = store.create("graphic");
      store.setName(id, "My Shape");
      expect(store.getName(id)).toBe("My Shape");
    });

    it("returns empty string for missing block", () => {
      expect(store.getName(999)).toBe("");
    });
  });

  // --- Query ---

  describe("findByType", () => {
    it("finds blocks by type", () => {
      const g1 = store.create("graphic");
      const g2 = store.create("graphic");
      store.create("text");

      const found = store.findByType("graphic");
      expect(found).toContain(g1);
      expect(found).toContain(g2);
      expect(found).toHaveLength(2);
    });

    it("returns empty array when no matches", () => {
      expect(store.findByType("scene")).toEqual([]);
    });
  });

  describe("findByKind", () => {
    it("finds blocks by kind", () => {
      const id = store.create("graphic", "circle");
      store.create("graphic", "rectangle");

      const found = store.findByKind("circle");
      expect(found).toEqual([id]);
    });
  });

  // --- Hierarchy (delegated) ---

  describe("hierarchy delegation", () => {
    it("appendChild / getChildren / getParent", () => {
      const parent = store.create("page");
      const child = store.create("graphic");

      store.appendChild(parent, child);

      expect(store.getChildren(parent)).toEqual([child]);
      expect(store.getParent(child)).toBe(parent);
    });

    it("removeChild", () => {
      const parent = store.create("page");
      const child = store.create("graphic");

      store.appendChild(parent, child);
      store.removeChild(parent, child);

      expect(store.getChildren(parent)).toEqual([]);
      expect(store.getParent(child)).toBeNull();
    });
  });

  // --- Properties (delegated) ---

  describe("properties delegation", () => {
    it("setProperty / getProperty", () => {
      const id = store.create("graphic");
      store.setProperty(id, "custom", 42);
      expect(store.getProperty(id, "custom")).toBe(42);
    });

    it("getFloat", () => {
      const id = store.create("graphic");
      expect(store.getFloat(id, POSITION_X)).toBe(0);
    });

    it("getString", () => {
      const id = store.create("image");
      expect(store.getString(id, IMAGE_SRC)).toBe("");
    });

    it("getBool", () => {
      const id = store.create("graphic");
      expect(store.getBool(id, VISIBLE)).toBe(true);
    });

    it("getColor", () => {
      const id = store.create("page");
      const color = store.getColor(id, FILL_COLOR);
      expect(color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    it("findAllProperties", () => {
      const id = store.create("graphic");
      const keys = store.findAllProperties(id);
      expect(keys).toContain(POSITION_X);
      expect(keys).toContain(OPACITY);
    });
  });

  // --- Snapshots (delegated) ---

  describe("snapshot / restore", () => {
    it("snapshot returns deep copy", () => {
      const id = store.create("graphic");
      const snap = store.snapshot(id);
      expect(snap).not.toBeNull();
      expect(snap!.id).toBe(id);
    });

    it("snapshot returns null for missing block", () => {
      expect(store.snapshot(999)).toBeNull();
    });

    it("restore overwrites block data", () => {
      const id = store.create("graphic");
      const snap = store.snapshot(id)!;
      snap.kind = "restored";
      store.restore(snap);
      expect(store.getKind(id)).toBe("restored");
    });
  });
});
