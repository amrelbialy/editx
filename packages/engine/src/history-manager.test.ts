import { beforeEach, describe, expect, it } from "vitest";
import { HistoryManager, type Patch } from "./history-manager";

function makePatch(id: number, before: any = null, after: any = null): Patch {
  return { id, before, after };
}

describe("HistoryManager", () => {
  let history: HistoryManager;

  beforeEach(() => {
    history = new HistoryManager();
  });

  describe("initial state", () => {
    it("canUndo is false", () => {
      expect(history.canUndo()).toBe(false);
    });

    it("canRedo is false", () => {
      expect(history.canRedo()).toBe(false);
    });

    it("undo returns null", () => {
      expect(history.undo()).toBeNull();
    });

    it("redo returns null", () => {
      expect(history.redo()).toBeNull();
    });
  });

  describe("push", () => {
    it("makes canUndo true", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      expect(history.canUndo()).toBe(true);
    });

    it("canRedo is still false after push", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe("undo", () => {
    it("returns patches with before/after swapped", () => {
      const before = { id: 1, type: "graphic" };
      const after = { id: 1, type: "text" };
      history.push([makePatch(1, before, after)]);

      const undone = history.undo()!;
      expect(undone).toHaveLength(1);
      expect(undone[0].before).toBe(after); // swapped
      expect(undone[0].after).toBe(before); // swapped
    });

    it("reverses patch order", () => {
      history.push([makePatch(1, "a", "b"), makePatch(2, "c", "d")]);

      const undone = history.undo()!;
      expect(undone[0].id).toBe(2); // reversed
      expect(undone[1].id).toBe(1);
    });

    it("makes canRedo true after undo", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      history.undo();
      expect(history.canRedo()).toBe(true);
    });

    it("makes canUndo false after undoing the only entry", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      history.undo();
      expect(history.canUndo()).toBe(false);
    });
  });

  describe("redo", () => {
    it("returns the original patches (not swapped)", () => {
      const before = { id: 1, type: "graphic" };
      const after = { id: 1, type: "text" };
      history.push([makePatch(1, before, after)]);
      history.undo();

      const redone = history.redo()!;
      expect(redone).toHaveLength(1);
      expect(redone[0].before).toBe(before);
      expect(redone[0].after).toBe(after);
    });

    it("makes canUndo true after redo", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      history.undo();
      history.redo();
      expect(history.canUndo()).toBe(true);
    });

    it("makes canRedo false after redoing the only entry", () => {
      history.push([makePatch(1, null, { id: 1 })]);
      history.undo();
      history.redo();
      expect(history.canRedo()).toBe(false);
    });
  });

  describe("push truncates redo branch", () => {
    it("canRedo becomes false after push following undo", () => {
      history.push([makePatch(1, null, "a")]);
      history.push([makePatch(2, null, "b")]);
      history.undo();
      expect(history.canRedo()).toBe(true);

      history.push([makePatch(3, null, "c")]);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe("multiple undo/redo", () => {
    it("supports multiple undo/redo steps", () => {
      history.push([makePatch(1, null, "a")]);
      history.push([makePatch(2, null, "b")]);
      history.push([makePatch(3, null, "c")]);

      expect(history.canUndo()).toBe(true);
      history.undo(); // undo 'c'
      history.undo(); // undo 'b'
      expect(history.canUndo()).toBe(true);
      history.undo(); // undo 'a'
      expect(history.canUndo()).toBe(false);

      expect(history.canRedo()).toBe(true);
      history.redo(); // redo 'a'
      history.redo(); // redo 'b'
      history.redo(); // redo 'c'
      expect(history.canRedo()).toBe(false);
    });
  });

  describe("clear", () => {
    it("resets everything", () => {
      history.push([makePatch(1, null, "a")]);
      history.push([makePatch(2, null, "b")]);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.undo()).toBeNull();
      expect(history.redo()).toBeNull();
    });
  });
});
