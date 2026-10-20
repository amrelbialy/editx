import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

async function setup() {
  const renderer = createMockRenderer();
  renderer.setPageView = vi.fn();
  renderer.getPageViewBounds = vi.fn().mockReturnValue(null);
  const engine = new EditxEngine({ renderer });
  await engine.scene.create();
  const first = engine.getActivePage()!;
  const firstBlock = engine.block.create("text");
  engine.block.appendChild(first, firstBlock);
  const group = engine.block.create("group");
  engine.block.appendChild(first, group);
  const second = engine.scene.addPage();
  const secondBlock = engine.block.create("text");
  engine.block.appendChild(second, secondBlock);
  engine.setActivePage(first);
  engine.editor.setPageViewMode("active-page");
  return { engine, first, firstBlock, group, second, secondBlock };
}

describe("isolated page transient-state cleanup", () => {
  it("ends orphan text sessions before loading a document that reuses their IDs", async () => {
    const { engine, firstBlock } = await setup();
    const saved = engine.scene.saveToString();
    const session = engine.block.beginTextEditing(firstBlock);
    const dispose = vi.spyOn(session, "dispose");
    engine.block.destroy(firstBlock);
    expect(engine.block.getTextEditingSession(firstBlock)).not.toBeNull();

    await engine.scene.loadFromString(saved);

    expect(engine.block.getTextEditingSession(firstBlock)).toBeNull();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(engine.block.beginTextEditing(firstBlock)).not.toBe(session);
    expect(engine.scene.saveToString()).toBe(saved);
  });

  it("settles text, selection, and group context before replacing matching block identities", async () => {
    const { engine, first, firstBlock, group } = await setup();
    const saved = engine.scene.saveToString();
    engine.block.beginTextEditing(firstBlock);
    engine.block.select(firstBlock);
    engine.block.enterGroup(group);
    const loaded = vi.fn(() => {
      expect(engine.block.getTextEditingSession(firstBlock)).toBeNull();
      expect(engine.block.findAllSelected()).toEqual([]);
      expect(engine.block.getGroupContext()).toEqual([]);
    });
    engine.on("history:clear", loaded);

    await engine.scene.loadFromString(saved);

    expect(loaded).toHaveBeenCalledTimes(1);
    expect(engine.getActivePage()).toBe(first);
    expect(engine.scene.saveToString()).toBe(saved);
  });

  it("cancels crop before a same-ID scene replacement without committing the preview", async () => {
    const { engine, firstBlock } = await setup();
    const saved = engine.scene.saveToString();
    engine.editor.setEditMode("Crop", { blockId: firstBlock });
    const cancel = vi.spyOn(engine.editor, "cancelCrop");

    await engine.scene.loadFromString(saved);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(engine.editor.getEditMode()).toBe("Transform");
    expect(engine.scene.saveToString()).toBe(saved);
  });

  it("preserves selection/group but safely ends crop before changing page geometry", async () => {
    const { engine, firstBlock, group } = await setup();
    engine.editor.setPageViewMode("all-pages");
    engine.block.select(firstBlock);
    engine.block.enterGroup(group);
    engine.editor.setEditMode("Crop", { blockId: firstBlock });

    engine.editor.setPageViewMode("active-page");

    expect(engine.block.findAllSelected()).toEqual([firstBlock]);
    expect(engine.block.getGroupContext()).toEqual([group]);
    expect(engine.editor.getEditMode()).toBe("Transform");
  });

  it("ends engine text sessions before installing continuous wrappers", async () => {
    const { engine, firstBlock } = await setup();
    engine.block.beginTextEditing(firstBlock);
    engine.editor.setPageViewMode("vertical-pages");
    expect(engine.block.getTextEditingSession(firstBlock)).toBeNull();
  });

  it("clears selection/group and ends hidden text sessions on a page switch", async () => {
    const { engine, group, second, secondBlock } = await setup();
    engine.block.select(secondBlock);
    engine.block.enterGroup(group);
    engine.block.beginTextEditing(secondBlock);

    engine.setActivePage(second);

    expect(engine.block.findAllSelected()).toEqual([]);
    expect(engine.block.getGroupContext()).toEqual([]);
    expect(engine.block.getTextEditingSession(secondBlock)).not.toBeNull();
  });

  it("ends a text session that becomes hidden", async () => {
    const { engine, firstBlock, second } = await setup();
    engine.block.beginTextEditing(firstBlock);
    engine.setActivePage(second);
    expect(engine.block.getTextEditingSession(firstBlock)).toBeNull();
  });

  it("removes selection and group ownership moved off-page without changing active id", async () => {
    const { engine, firstBlock, group, second } = await setup();
    engine.block.select(firstBlock);
    engine.block.enterGroup(group);

    engine.block.appendChild(second, firstBlock);
    engine.block.appendChild(second, group);

    expect(engine.block.findAllSelected()).toEqual([]);
    expect(engine.block.getGroupContext()).toEqual([]);
  });

  it("cancels crop without committing when its owner becomes hidden", async () => {
    const { engine, first, second } = await setup();
    const image = engine.block.create("image");
    engine.block.appendChild(first, image);
    engine.block.select(image);
    engine.editor.setEditMode("Crop", { blockId: image });
    const cancel = vi.spyOn(engine.editor, "cancelCrop");
    const before = engine._getBlockStore().snapshot(image)!.properties;

    engine.block.appendChild(second, image);

    expect(cancel).toHaveBeenCalled();
    expect(engine.editor.getEditMode()).toBe("Transform");
    expect(engine._getBlockStore().snapshot(image)!.properties).toEqual(before);
  });
});
