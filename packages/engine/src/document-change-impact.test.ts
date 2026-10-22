import { describe, expect, it } from "vitest";
import { collectDocumentChanges, documentChangeFixture } from "./__tests__/document-change-fixture";
import { EditxEngine } from "./editx-engine";

describe("document affected pages", () => {
  it("includes old/new ownership when moving a group and replaying history", async () => {
    const { engine, first, second, x, z } = await documentChangeFixture();
    const group = engine.block.group([x, z]);
    const events = collectDocumentChanges(engine);
    engine.block.appendChild(second, group);
    expect(events[0].changedBlockIds).toEqual([second, group, first]);
    expect(events[0].affectedPageIds).toEqual([second, first]);
    engine.undo();
    expect(events[1].origin).toBe("undo");
    expect(new Set(events[1].affectedPageIds)).toEqual(new Set([first, second]));
    engine.redo();
    expect(events[2].origin).toBe("redo");
    expect(new Set(events[2].affectedPageIds)).toEqual(new Set([first, second]));
    engine.block.destroy(x);
    expect(events[3].affectedPageIds).toEqual([second]);
  });

  it.each([
    "fill",
    "shape",
    "effect",
  ] as const)("resolves every page using a shared %s through groups", async (type) => {
    const { engine, first, second, x, y } = await documentChangeFixture();
    const a = engine.block.addShape(first, "rect", "color", 0, 0, 10, 10);
    const b = engine.block.addShape(second, "rect", "color", 0, 0, 10, 10);
    engine.block.group([a, x]);
    engine.block.group([b, y]);
    let resource: number;
    if (type === "fill") {
      resource = engine.block.getFill(a)!;
      engine.block.setFill(b, resource);
    } else if (type === "shape") {
      resource = engine.block.getShape(a)!;
      engine.block.setShape(b, resource);
    } else {
      resource = engine.block.createEffect("filter");
      engine.block.appendEffect(a, resource);
      engine.block.appendEffect(b, resource);
    }
    const events = collectDocumentChanges(engine);
    engine.block.setName(resource, "shared resource");
    expect(events).toHaveLength(1);
    expect(events[0].changedBlockIds).toEqual([resource]);
    expect(new Set(events[0].affectedPageIds)).toEqual(new Set([first, second]));
  });

  it("reports deleted roots/pages and restored root validity on undo/redo", async () => {
    const engine = new EditxEngine();
    await engine.scene.create();
    const root = engine.scene.getScene()!;
    const first = engine.scene.getCurrentPage()!;
    const second = engine.scene.addPage();
    const events = collectDocumentChanges(engine);
    engine.block.destroy(root);
    expect(events[0].changedBlockIds).toEqual([root, first, second]);
    expect(events[0].affectedPageIds).toEqual([first, second]);
    expect(engine.document.getRootSceneId()).toBeNull();
    engine.undo();
    expect(events[1].origin).toBe("undo");
    expect(new Set(events[1].affectedPageIds)).toEqual(new Set([first, second]));
    expect(engine.document.getRootSceneId()).toBe(root);
    engine.redo();
    expect(events[2].origin).toBe("redo");
    expect(engine.document.getRootSceneId()).toBeNull();
  });

  it("includes page-order impacts and old/new root pages without marking unchanged blocks", async () => {
    const { engine, root, first, second } = await documentChangeFixture();
    const third = engine.scene.addPage();
    const events = collectDocumentChanges(engine);
    engine.scene.movePage(third, 0);
    expect(events[0].changedBlockIds).toEqual([root]);
    expect(events[0].affectedPageIds).toEqual([first, second, third]);
    await engine.scene.create();
    const newPage = engine.scene.getCurrentPage()!;
    expect(events[1].origin).toBe("create");
    expect(events[1].changedBlockIds).toEqual([engine.scene.getScene(), newPage]);
    expect(events[1].affectedPageIds).toEqual([newPage, third, first, second]);
  });

  it("allows unattached changes without an affected page", async () => {
    const { engine } = await documentChangeFixture();
    const events = collectDocumentChanges(engine);
    const detached = engine.block.create("graphic");
    expect(events[0].changedBlockIds).toEqual([detached]);
    expect(events[0].affectedPageIds).toEqual([]);
  });
});
