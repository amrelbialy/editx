import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditxEngine } from "./editx-engine";
import type { PageOrderChangedEvent } from "./index";

describe("page-order notifications", () => {
  let engine: EditxEngine;
  let first: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create();
    first = engine.getActivePage()!;
  });

  it("offers equivalent engine/scene subscriptions with no initial event and unsubscribe", () => {
    const engineCallback = vi.fn();
    const sceneCallback = vi.fn();
    const unsubscribe = engine.onPageOrderChanged(engineCallback);
    const unsubscribeScene = engine.scene.onPageOrderChanged(sceneCallback);
    expect(engineCallback).not.toHaveBeenCalled();
    expect(sceneCallback).not.toHaveBeenCalled();
    const second = engine.scene.addPage();
    const event: PageOrderChangedEvent = {
      sceneId: engine.getActiveScene(),
      pageIds: [first, second],
      previousPageIds: [first],
    };
    expect(engineCallback).toHaveBeenCalledExactlyOnceWith(event);
    expect(sceneCallback).toHaveBeenCalledExactlyOnceWith(event);
    unsubscribe();
    unsubscribeScene();
    engine.scene.movePage(second, 0);
    expect(engineCallback).toHaveBeenCalledTimes(1);
    expect(sceneCallback).toHaveBeenCalledTimes(1);
  });

  it("tracks insertion, duplication, removal and replay without a renderer", () => {
    const callback = vi.fn();
    engine.onPageOrderChanged(callback);
    const second = engine.scene.addPage();
    const duplicate = engine.scene.duplicatePage(first);
    engine.scene.removePage(duplicate);
    engine.undo();
    engine.redo();
    expect(callback.mock.calls.map(([event]) => event.pageIds)).toEqual([
      [first, second],
      [first, duplicate, second],
      [first, second],
      [first, duplicate, second],
      [first, second],
    ]);
    expect(callback.mock.calls.map(([event]) => event.previousPageIds)).toEqual([
      [first],
      [first, second],
      [first, duplicate, second],
      [first, second],
      [first, duplicate, second],
    ]);
  });

  it("ignores page activation and content-only mutations", () => {
    const second = engine.scene.addPage();
    const callback = vi.fn();
    engine.onPageOrderChanged(callback);
    engine.scene.setActivePage(first);
    engine.scene.setActivePage(second);
    engine.block.setName(first, "Cover");
    const text = engine.block.create("text");
    engine.block.appendChild(first, text);
    engine.block.setSize(text, 100, 50);
    expect(callback).not.toHaveBeenCalled();
  });

  it("reports final creation and scene switches, and loading an altered sequence", async () => {
    const originalScene = engine.getActiveScene()!;
    const callback = vi.fn();
    engine.onPageOrderChanged(callback);
    await engine.scene.create();
    const createdScene = engine.getActiveScene();
    const createdPage = engine.getActivePage()!;
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      sceneId: createdScene,
      pageIds: [createdPage],
      previousPageIds: [first],
    });
    engine.setActiveScene(originalScene);
    expect(callback).toHaveBeenLastCalledWith({
      sceneId: originalScene,
      pageIds: [first],
      previousPageIds: [createdPage],
    });
    const saved = engine.scene.saveToString();
    engine.scene.addPage();
    callback.mockClear();
    await engine.scene.loadFromString(saved);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].pageIds).toEqual([first]);
  });

  it("distinguishes empty scene identities and clearing the active document", () => {
    const a = engine.block.create("scene");
    const b = engine.block.create("scene");
    engine.setActiveScene(a);
    const callback = vi.fn();
    engine.onPageOrderChanged(callback);
    engine.setActiveScene(b);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      sceneId: b,
      pageIds: [],
      previousPageIds: [],
    });
    engine.setActiveScene(b);
    expect(callback).toHaveBeenCalledTimes(1);
    engine._setActiveSceneAndPage(null, null);
    expect(callback).toHaveBeenLastCalledWith({
      sceneId: null,
      pageIds: [],
      previousPageIds: [],
    });
  });

  it("freezes independent payload snapshots so consumers cannot corrupt later notifications", () => {
    const events: PageOrderChangedEvent[] = [];
    engine.onPageOrderChanged((event) => {
      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.pageIds)).toBe(true);
      expect(Object.isFrozen(event.previousPageIds)).toBe(true);
      expect(Reflect.set(event.pageIds, "0", 9999)).toBe(false);
      events.push(event);
    });
    const second = engine.scene.addPage();
    engine.scene.movePage(second, 0);
    expect(events[0].pageIds).toEqual([first, second]);
    expect(events[1].previousPageIds).toEqual([first, second]);
    expect(events[1].pageIds).toEqual([second, first]);
    expect(events[1].previousPageIds).not.toBe(events[0].pageIds);
  });
});
