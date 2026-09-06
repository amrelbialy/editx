import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";

describe("BlockAPI duplicate — deep hierarchy", () => {
  let engine: EditxEngine;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: createMockRenderer() });
  });

  it("copies nested resources and properties in one undoable batch", () => {
    const block = engine.block;
    const page = block.create("page");
    const before = block.create("graphic");
    const root = block.create("group");
    const child = block.create("graphic");
    const nestedGroup = block.create("group");
    const grandchild = block.create("graphic");

    block.appendChild(page, before);
    block.appendChild(page, root);
    block.appendChild(root, child);
    block.appendChild(root, nestedGroup);
    block.appendChild(nestedGroup, grandchild);
    block.setPosition(root, 100, 200);
    block.setPosition(child, 7, 11);
    block.setRotation(child, 15);
    block.setPosition(nestedGroup, 30, 40);
    block.setPosition(grandchild, 3, 5);
    block.setKind(root, "root-kind");
    block.setKind(grandchild, "leaf-kind");

    const textRuns = [{ text: "deep", style: { backgroundPadding: { left: 4 } } }];
    block.setProperty(grandchild, "custom/runs", textRuns);

    const childShape = block.createShape("rect");
    const childFill = block.createFill("gradient");
    const firstEffect = block.createEffect("adjustments");
    const secondEffect = block.createEffect("filter");
    block.setProperty(childShape, "custom/shape", { r: 1, g: 2, b: 3, a: 1 });
    block.setProperty(childFill, "custom/stops", [
      { offset: 0, color: "#000" },
      { offset: 1, color: "#fff" },
    ]);
    block.setProperty(firstEffect, "custom/order", 1);
    block.setProperty(secondEffect, "custom/order", 2);
    block.setShape(child, childShape);
    block.setFill(child, childFill);
    block.appendEffect(child, firstEffect);
    block.appendEffect(child, secondEffect);

    const grandchildShape = block.createShape("ellipse");
    const grandchildFill = block.createFill("color");
    block.setShape(grandchild, grandchildShape);
    block.setFill(grandchild, grandchildFill);

    block.select(before);
    block.enterGroup(root);
    engine.clearHistory();

    const duplicate = block.duplicate(root);
    const [duplicateChild, duplicateNestedGroup] = block.getChildren(duplicate);
    const [duplicateGrandchild] = block.getChildren(duplicateNestedGroup);
    const duplicateEffects = block.getEffects(duplicateChild);

    expect(block.getChildren(page)).toEqual([before, root, duplicate]);
    expect(block.getChildren(duplicate)).toHaveLength(2);
    expect(block.getChildren(duplicateNestedGroup)).toHaveLength(1);
    const originalIds = new Set([root, child, nestedGroup, grandchild]);
    const duplicateIds = [duplicate, duplicateChild, duplicateNestedGroup, duplicateGrandchild];
    expect(new Set(duplicateIds).size).toBe(4);
    expect(duplicateIds.every((id) => !originalIds.has(id))).toBe(true);
    expect(block.getKind(duplicate)).toBe("root-kind");
    expect(block.getKind(duplicateGrandchild)).toBe("leaf-kind");
    expect(block.getPosition(duplicate)).toEqual({ x: 120, y: 220 });
    expect(block.getPosition(duplicateChild)).toEqual({ x: 7, y: 11 });
    expect(block.getRotation(duplicateChild)).toBe(15);
    expect(block.getPosition(duplicateNestedGroup)).toEqual({ x: 30, y: 40 });
    expect(block.getPosition(duplicateGrandchild)).toEqual({ x: 3, y: 5 });

    const duplicateChildShape = block.getShape(duplicateChild) as number;
    const duplicateChildFill = block.getFill(duplicateChild) as number;
    const duplicateGrandchildShape = block.getShape(duplicateGrandchild) as number;
    const duplicateGrandchildFill = block.getFill(duplicateGrandchild) as number;
    const originalResourceIds = new Set([
      childShape,
      childFill,
      firstEffect,
      secondEffect,
      grandchildShape,
      grandchildFill,
    ]);
    const duplicateResourceIds = [
      duplicateChildShape,
      duplicateChildFill,
      ...duplicateEffects,
      duplicateGrandchildShape,
      duplicateGrandchildFill,
    ];
    expect(new Set(duplicateResourceIds).size).toBe(6);
    expect(duplicateResourceIds.every((id) => !originalResourceIds.has(id))).toBe(true);
    expect(duplicateChildShape).not.toBe(childShape);
    expect(duplicateChildFill).not.toBe(childFill);
    expect(block.getProperty(duplicateChildShape, "custom/shape")).not.toBe(
      block.getProperty(childShape, "custom/shape"),
    );
    const originalStops = block.getProperty(childFill, "custom/stops");
    const duplicateStops = block.getProperty(duplicateChildFill, "custom/stops");
    expect(duplicateStops).not.toBe(originalStops);
    if (!Array.isArray(originalStops) || !Array.isArray(duplicateStops)) {
      throw new Error("Expected gradient stop arrays");
    }
    expect(duplicateStops[0]).not.toBe(originalStops[0]);
    expect(duplicateEffects).toHaveLength(2);
    expect(duplicateEffects).not.toEqual([firstEffect, secondEffect]);
    expect(duplicateEffects.map((id) => block.getFloat(id, "custom/order"))).toEqual([1, 2]);
    expect(duplicateGrandchildShape).not.toBe(grandchildShape);
    expect(duplicateGrandchildFill).not.toBe(grandchildFill);

    const copiedRuns = block.getProperty(duplicateGrandchild, "custom/runs");
    expect(copiedRuns).toEqual(textRuns);
    expect(copiedRuns).not.toBe(textRuns);
    if (!Array.isArray(copiedRuns)) throw new Error("Expected text runs");
    expect(copiedRuns[0]).not.toBe(textRuns[0]);
    expect(block.findAllSelected()).toEqual([duplicate]);
    expect(block.getGroupContext()).toEqual([root]);

    engine.undo();
    expect(block.getChildren(page)).toEqual([before, root]);
    expect([...duplicateIds, ...duplicateResourceIds].every((id) => !block.isValid(id))).toBe(true);
    expect(block.getGroupContext()).toEqual([root]);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);

    engine.redo();
    expect(block.getChildren(page)).toEqual([before, root, duplicate]);
    expect(block.getChildren(duplicate)).toEqual([duplicateChild, duplicateNestedGroup]);
    expect(block.getChildren(duplicateNestedGroup)).toEqual([duplicateGrandchild]);
    expect(block.getEffects(duplicateChild)).toEqual(duplicateEffects);
    expect([...duplicateIds, ...duplicateResourceIds].every((id) => block.isValid(id))).toBe(true);
    expect(block.getGroupContext()).toEqual([root]);
  });
});
